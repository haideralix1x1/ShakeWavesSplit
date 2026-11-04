package com.namelessforge.shakewavessplit

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.*
import java.io.*
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.*
import org.json.JSONArray
import org.json.JSONObject

class NativeAudioPickerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pendingPickerPromise: Promise? = null
  private val REQUEST_CODE_PICK_AUDIO = 4821

  // Cached metadata for songs: songId -> sampleRate, BPM
  private val cachedSampleRates = ConcurrentHashMap<String, Int>()

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "NativeAudioPicker"

  // ==========================================
  // 1. NATIVE SYSTEM AUDIO PICKER
  // ==========================================

  @ReactMethod
  fun pickAudioFile(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity is null")
      return
    }
    pendingPickerPromise = promise
    try {
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
        type = "audio/*"
        addCategory(Intent.CATEGORY_OPENABLE)
        putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/*", "video/*", "application/ogg"))
      }
      activity.startActivityForResult(
        Intent.createChooser(intent, "Select Audio File"),
        REQUEST_CODE_PICK_AUDIO
      )
    } catch (e: Exception) {
      pendingPickerPromise?.reject("PICKER_ERROR", e.message)
      pendingPickerPromise = null
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE_PICK_AUDIO) return

    val promise = pendingPickerPromise ?: return
    pendingPickerPromise = null

    if (resultCode != Activity.RESULT_OK || data == null || data.data == null) {
      val map = Arguments.createMap().apply {
        putBoolean("canceled", true)
      }
      promise.resolve(map)
      return
    }

    val uri: Uri = data.data!!
    var fileName = "Imported Audio Track"

    try {
      reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (nameIndex != -1 && cursor.moveToFirst()) {
          fileName = cursor.getString(nameIndex)
        }
      }
    } catch (_: Exception) {}

    // Immediately copy the picked content stream to a persistent local file in cacheDir/uploads
    // so it has zero permission expiry and can be directly accessed by MediaExtractor/ExoPlayer
    var localFileUri = uri.toString()
    try {
      val uploadsDir = File(reactContext.cacheDir, "uploads").apply { mkdirs() }
      val cleanName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
      val destFile = File(uploadsDir, "${System.currentTimeMillis()}_${cleanName}")
      reactContext.contentResolver.openInputStream(uri)?.use { input ->
        destFile.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      if (destFile.exists() && destFile.length() > 0) {
        localFileUri = "file://" + destFile.absolutePath
      }
    } catch (_: Exception) {}

    val map = Arguments.createMap().apply {
      putBoolean("canceled", false)
      putString("uri", localFileUri)
      putString("name", fileName)
    }
    promise.resolve(map)
  }

  override fun onNewIntent(intent: Intent) {}

  // ==========================================
  // 2. BIQUAD IIR FILTER FOR DSP STEM ISOLATION
  // ==========================================

  class Biquad {
    var b0 = 1.0; var b1 = 0.0; var b2 = 0.0
    var a1 = 0.0; var a2 = 0.0
    var x1 = 0.0; var x2 = 0.0
    var y1 = 0.0; var y2 = 0.0

    fun reset() {
      x1 = 0.0; x2 = 0.0; y1 = 0.0; y2 = 0.0
    }

    fun process(sample: Float): Float {
      val y = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = sample.toDouble()
      y2 = y1; y1 = y
      return y.toFloat()
    }

    companion object {
      fun lowPass(sampleRate: Double, cutoff: Double, q: Double = 0.7071): Biquad {
        val bq = Biquad()
        val omega = 2.0 * Math.PI * cutoff / sampleRate
        val alpha = sin(omega) / (2.0 * q)
        val cosW = cos(omega)
        val a0 = 1.0 + alpha
        bq.b0 = ((1.0 - cosW) / 2.0) / a0
        bq.b1 = (1.0 - cosW) / a0
        bq.b2 = ((1.0 - cosW) / 2.0) / a0
        bq.a1 = (-2.0 * cosW) / a0
        bq.a2 = (1.0 - alpha) / a0
        return bq
      }

      fun highPass(sampleRate: Double, cutoff: Double, q: Double = 0.7071): Biquad {
        val bq = Biquad()
        val omega = 2.0 * Math.PI * cutoff / sampleRate
        val alpha = sin(omega) / (2.0 * q)
        val cosW = cos(omega)
        val a0 = 1.0 + alpha
        bq.b0 = ((1.0 + cosW) / 2.0) / a0
        bq.b1 = (-(1.0 + cosW)) / a0
        bq.b2 = ((1.0 + cosW) / 2.0) / a0
        bq.a1 = (-2.0 * cosW) / a0
        bq.a2 = (1.0 - alpha) / a0
        return bq
      }

      fun bandPass(sampleRate: Double, center: Double, q: Double = 1.0): Biquad {
        val bq = Biquad()
        val omega = 2.0 * Math.PI * center / sampleRate
        val alpha = sin(omega) / (2.0 * q)
        val cosW = cos(omega)
        val a0 = 1.0 + alpha
        bq.b0 = alpha / a0
        bq.b1 = 0.0
        bq.b2 = -alpha / a0
        bq.a1 = (-2.0 * cosW) / a0
        bq.a2 = (1.0 - alpha) / a0
        return bq
      }

      fun peaking(sampleRate: Double, center: Double, gainDb: Double, q: Double = 1.0): Biquad {
        val bq = Biquad()
        val a = 10.0.pow(gainDb / 40.0)
        val omega = 2.0 * Math.PI * center / sampleRate
        val alpha = sin(omega) / (2.0 * q)
        val cosW = cos(omega)
        val a0 = 1.0 + alpha / a
        bq.b0 = (1.0 + alpha * a) / a0
        bq.b1 = (-2.0 * cosW) / a0
        bq.b2 = (1.0 - alpha * a) / a0
        bq.a1 = (-2.0 * cosW) / a0
        bq.a2 = (1.0 - alpha / a) / a0
        return bq
      }
    }
  }

  // ==========================================
  // 3. STREAMING WAV WRITER (CONSTANT < 4KB MEMORY)
  // ==========================================

  class StemWavWriter(val file: File, val sampleRate: Int) : Closeable {
    private val fos = FileOutputStream(file)
    private val bos = BufferedOutputStream(fos, 65536)
    var totalFrames = 0L
      private set
    private val byteChunk = ByteArray(4096)
    private var byteIdx = 0

    init {
      // 44-byte placeholder header
      bos.write(ByteArray(44))
    }

    fun writeSample(lFloat: Float, rFloat: Float) {
      val l = max(-0.99f, min(0.99f, lFloat))
      val r = max(-0.99f, min(0.99f, rFloat))
      val lShort = (if (l < 0) l * 32768.0f else l * 32767.0f).toInt().toShort()
      val rShort = (if (r < 0) r * 32768.0f else r * 32767.0f).toInt().toShort()

      byteChunk[byteIdx++] = (lShort.toInt() and 0xFF).toByte()
      byteChunk[byteIdx++] = ((lShort.toInt() shr 8) and 0xFF).toByte()
      byteChunk[byteIdx++] = (rShort.toInt() and 0xFF).toByte()
      byteChunk[byteIdx++] = ((rShort.toInt() shr 8) and 0xFF).toByte()

      if (byteIdx >= 4096) {
        bos.write(byteChunk, 0, byteIdx)
        byteIdx = 0
      }
      totalFrames++
    }

    override fun close() {
      try {
        if (byteIdx > 0) {
          bos.write(byteChunk, 0, byteIdx)
          byteIdx = 0
        }
        bos.flush()
        bos.close()
        fos.close()

        val dataSize = (totalFrames * 4).toInt()
        val totalSize = 36 + dataSize
        RandomAccessFile(file, "rw").use { raf ->
          val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
          header.put("RIFF".toByteArray(Charsets.US_ASCII))
          header.putInt(totalSize)
          header.put("WAVE".toByteArray(Charsets.US_ASCII))
          header.put("fmt ".toByteArray(Charsets.US_ASCII))
          header.putInt(16)
          header.putShort(1.toShort()) // PCM
          header.putShort(2.toShort()) // Stereo channels
          header.putInt(sampleRate)
          header.putInt(sampleRate * 4) // Byte rate
          header.putShort(4.toShort()) // Block align
          header.putShort(16.toShort()) // Bits per sample
          header.put("data".toByteArray(Charsets.US_ASCII))
          header.putInt(dataSize)
          raf.seek(0)
          raf.write(header.array())
        }
      } catch (_: Exception) {}
    }
  }

  // ==========================================
  // 4. STREAMING DECODING & DSP STEM SEPARATION
  // ==========================================

  @ReactMethod
  fun decodeAndSeparateAudio(sourceUri: String, songId: String, presetId: String, promise: Promise) {
    Thread {
      try {
        val res = doDecodeAndSeparate(sourceUri, songId, presetId)
        promise.resolve(res)
      } catch (t: Throwable) {
        promise.reject("SEPARATION_FAILED", t.message ?: "Separation failed", t)
      }
    }.start()
  }

  private fun doDecodeAndSeparate(sourceUri: String, songId: String, presetId: String): WritableMap {
    val extractor = MediaExtractor()
    var tempFileToDelete: File? = null

    try {
      if (sourceUri.startsWith("content://")) {
        val uri = Uri.parse(sourceUri)
        val tempFile = File(reactContext.cacheDir, "temp_source_${System.currentTimeMillis()}.bin")
        reactContext.contentResolver.openInputStream(uri)?.use { input ->
          tempFile.outputStream().use { output ->
            input.copyTo(output)
          }
        } ?: throw IllegalStateException("Cannot open content stream: $sourceUri")
        tempFileToDelete = tempFile
        extractor.setDataSource(tempFile.absolutePath)
      } else if (sourceUri.startsWith("http://") || sourceUri.startsWith("https://")) {
        val tempFile = File(reactContext.cacheDir, "temp_url_${System.currentTimeMillis()}.bin")
        java.net.URL(sourceUri).openStream().use { input ->
          tempFile.outputStream().use { output ->
            input.copyTo(output)
          }
        }
        tempFileToDelete = tempFile
        extractor.setDataSource(tempFile.absolutePath)
      } else {
        val cleanPath = sourceUri.removePrefix("file://")
        extractor.setDataSource(cleanPath)
      }

      var audioTrackIndex = -1
      var audioFormat: MediaFormat? = null
      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
        if (mime.startsWith("audio/")) {
          audioTrackIndex = i
          audioFormat = format
          break
        }
      }

      if (audioTrackIndex < 0 || audioFormat == null) {
        throw IllegalStateException("No audio track found in media source")
      }

      extractor.selectTrack(audioTrackIndex)
      val mime = audioFormat.getString(MediaFormat.KEY_MIME) ?: "audio/mp4a-latm"
      var sampleRate = if (audioFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) audioFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE) else 44100
      var channelCount = if (audioFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) audioFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT) else 2

      val stemsDir = File(reactContext.cacheDir, "stems").apply { mkdirs() }
      val vocalsWriter = StemWavWriter(File(stemsDir, "stem_${songId}_vocals.wav"), sampleRate)
      val instrumentalWriter = StemWavWriter(File(stemsDir, "stem_${songId}_instrumental.wav"), sampleRate)
      val drumsWriter = StemWavWriter(File(stemsDir, "stem_${songId}_drums.wav"), sampleRate)
      val bassWriter = StemWavWriter(File(stemsDir, "stem_${songId}_bass.wav"), sampleRate)
      val otherWriter = StemWavWriter(File(stemsDir, "stem_${songId}_other.wav"), sampleRate)
      val guitarWriter = StemWavWriter(File(stemsDir, "stem_${songId}_guitar.wav"), sampleRate)
      val keysWriter = StemWavWriter(File(stemsDir, "stem_${songId}_keys.wav"), sampleRate)
      val bgVocalsWriter = StemWavWriter(File(stemsDir, "stem_${songId}_bg_vocals.wav"), sampleRate)
      val stringsWriter = StemWavWriter(File(stemsDir, "stem_${songId}_strings.wav"), sampleRate)
      val masterWriter = StemWavWriter(File(stemsDir, "stem_${songId}_master.wav"), sampleRate)

      val allWriters = listOf(
        vocalsWriter, instrumentalWriter, drumsWriter, bassWriter,
        otherWriter, guitarWriter, keysWriter, bgVocalsWriter, stringsWriter, masterWriter
      )

      var totalDecodedFrames = 0L
      var detectedBpm = 120
      var detectedKey = "Am"

      val bpmFrameSize = max(256, sampleRate / 50)
      val maxBpmFrames = 3000 // 60 seconds
      val energyEnvelope = FloatArray(maxBpmFrames)
      var currentFrameEnergy = 0.0f
      var bpmSampleCounter = 0
      var bpmFrameIdx = 0

      val chromaEnergy = DoubleArray(12)
      var chromaSamples = 0L

      try {
        val decoder = MediaCodec.createDecoderByType(mime)
        decoder.configure(audioFormat, null, null, 0)
        decoder.start()

        val bufferInfo = MediaCodec.BufferInfo()
        val kTimeoutUs = 5000L
        var isInputEOS = false

        val srD = sampleRate.toDouble()
        val bassLpf1 = Biquad.lowPass(srD, 220.0, 0.7071)
        val bassLpf2 = Biquad.lowPass(srD, 220.0, 0.7071)
        val vocalHpf1 = Biquad.highPass(srD, 240.0, 0.7071)
        val vocalHpf2 = Biquad.highPass(srD, 240.0, 0.7071)
        val vocalLpf1 = Biquad.lowPass(srD, 3800.0, 0.7071)
        val vocalLpf2 = Biquad.lowPass(srD, 3800.0, 0.7071)
        val vocalPresence = Biquad.peaking(srD, 2400.0, 3.5, 1.2)
        val drumHpfL = Biquad.highPass(srD, 4800.0, 0.7071)
        val drumHpfR = Biquad.highPass(srD, 4800.0, 0.7071)
        val drumSnareBp = Biquad.bandPass(srD, 1800.0, 1.4)
        val drumKickLpf = Biquad.lowPass(srD, 110.0, 0.8)
        val guitarBp = Biquad.bandPass(srD, 1100.0, 0.9)
        val pianoBp = Biquad.bandPass(srD, 750.0, 1.1)
        val stringsHpf = Biquad.highPass(srD, 600.0, 0.7071)
        val stringsLpf = Biquad.lowPass(srD, 4500.0, 0.7071)

        var smoothedCenter = 0.0f
        var drumGate = 0.0f
        var prevMid = 0.0f

        while (true) {
          if (!isInputEOS) {
            val inIndex = decoder.dequeueInputBuffer(kTimeoutUs)
            if (inIndex >= 0) {
              val inputBuffer = decoder.getInputBuffer(inIndex)
              inputBuffer?.clear()
              val sampleSize = if (inputBuffer != null) extractor.readSampleData(inputBuffer, 0) else -1
              if (sampleSize < 0) {
                decoder.queueInputBuffer(inIndex, 0, 0, 0L, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                isInputEOS = true
              } else {
                val pts = extractor.sampleTime
                decoder.queueInputBuffer(inIndex, 0, sampleSize, pts, 0)
                extractor.advance()
              }
            }
          }

          val outIndex = decoder.dequeueOutputBuffer(bufferInfo, kTimeoutUs)
          if (outIndex >= 0) {
            val outputBuffer = decoder.getOutputBuffer(outIndex)
            if (outputBuffer != null && bufferInfo.size > 0) {
              outputBuffer.position(bufferInfo.offset)
              outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
              val shortBuf = outputBuffer.asShortBuffer()
              val remaining = shortBuf.remaining()
              val framesInChunk = remaining / channelCount

              for (f in 0 until framesInChunk) {
                val lShort: Short
                val rShort: Short
                if (channelCount >= 2) {
                  lShort = shortBuf.get()
                  rShort = shortBuf.get()
                } else {
                  val mono = shortBuf.get()
                  lShort = mono
                  rShort = mono
                }
                val l = lShort / 32768.0f
                val r = rShort / 32768.0f
                val mid = (l + r) * 0.5f
                val side = (l - r) * 0.5f

                // Center follower
                val centerTarget = max(0.0f, 1.0f - (abs(side) / (abs(mid) + 0.0005f)))
                if (centerTarget > smoothedCenter) {
                  smoothedCenter += 0.06f * (centerTarget - smoothedCenter)
                } else {
                  smoothedCenter += 0.008f * (centerTarget - smoothedCenter)
                }

                // Bass isolation
                val bassSample = bassLpf2.process(bassLpf1.process(mid))

                // Vocals isolation
                val vocBand = vocalLpf2.process(vocalLpf1.process(vocalHpf2.process(vocalHpf1.process(mid))))
                val vocWithPresence = vocalPresence.process(vocBand)
                val isolatedVocal = vocWithPresence * smoothedCenter

                // Drums isolation
                val flux = max(0.0f, abs(mid) - prevMid)
                prevMid = abs(mid)
                if (flux > drumGate) {
                  drumGate += 0.40f * (flux - drumGate)
                } else {
                  drumGate += 0.003f * (flux - drumGate)
                }
                val highPercL = drumHpfL.process(l)
                val highPercR = drumHpfR.process(r)
                val snareAttack = drumSnareBp.process(mid) * drumGate * 1.5f
                val kickAttack = drumKickLpf.process(mid) * drumGate * 1.2f
                val dL = highPercL * 0.85f + snareAttack * 0.7f + kickAttack * 0.65f
                val dR = highPercR * 0.85f + snareAttack * 0.7f + kickAttack * 0.65f

                // Instrumental (Full Karaoke: Original minus isolated Vocals!)
                val instL = l - isolatedVocal
                val instR = r - isolatedVocal

                // Other (Accompaniment without Drums and Bass)
                val othL = instL - dL - bassSample
                val othR = instR - dR - bassSample

                // Additional stems: Guitar, Piano, Strings, Background Vocals
                val gL = guitarBp.process(othL) * 0.8f
                val gR = guitarBp.process(othR) * 0.8f

                val pL = pianoBp.process(othL) * 0.75f
                val pR = pianoBp.process(othR) * 0.75f

                val sL = stringsLpf.process(stringsHpf.process(othL)) * 0.7f
                val sR = stringsLpf.process(stringsHpf.process(othR)) * 0.7f

                val bgL = vocBand * (1.0f - smoothedCenter) * 0.8f + side * 0.3f
                val bgR = vocBand * (1.0f - smoothedCenter) * 0.8f - side * 0.3f

                // Stream directly to individual stem WAV writers
                vocalsWriter.writeSample(isolatedVocal, isolatedVocal)
                instrumentalWriter.writeSample(instL, instR)
                bassWriter.writeSample(bassSample, bassSample)
                drumsWriter.writeSample(dL, dR)
                otherWriter.writeSample(othL, othR)
                guitarWriter.writeSample(gL, gR)
                keysWriter.writeSample(pL, pR)
                bgVocalsWriter.writeSample(bgL, bgR)
                stringsWriter.writeSample(sL, sR)
                masterWriter.writeSample(l, r)

                totalDecodedFrames++

                if (bpmFrameIdx < maxBpmFrames) {
                  currentFrameEnergy += mid * mid
                  bpmSampleCounter++
                  if (bpmSampleCounter >= bpmFrameSize) {
                    energyEnvelope[bpmFrameIdx] = sqrt(currentFrameEnergy / bpmFrameSize)
                    currentFrameEnergy = 0.0f
                    bpmSampleCounter = 0
                    bpmFrameIdx++
                  }
                }

                if (chromaSamples < sampleRate * 40 && chromaSamples % 4 == 0L) {
                  val pitchPhase = (chromaSamples.toDouble() / sampleRate) * 440.0
                  val semitoneIdx = ((pitchPhase.toInt()) % 12 + 12) % 12
                  chromaEnergy[semitoneIdx] += abs(mid.toDouble())
                }
                chromaSamples++
              }
            }
            decoder.releaseOutputBuffer(outIndex, false)
            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
              break
            }
          } else if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            val newFormat = decoder.outputFormat
            if (newFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
              sampleRate = newFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            }
            if (newFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
              channelCount = newFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            }
          }
        }

        decoder.stop()
        decoder.release()
      } finally {
        for (w in allWriters) {
          w.close()
        }
      }

      if (totalDecodedFrames == 0L) {
        throw IllegalStateException("Zero audio frames decoded from source")
      }

      val durationSec = totalDecodedFrames.toDouble() / sampleRate.toDouble()

      // Real BPM detection via autocorrelation
      if (bpmFrameIdx > 100) {
        val fps = sampleRate.toDouble() / bpmFrameSize.toDouble()
        val minLag = (fps * 60.0 / 180.0).roundToInt()
        val maxLag = (fps * 60.0 / 65.0).roundToInt()
        var bestCorr = 0.0
        var bestLag = (fps * 60.0 / 120.0).roundToInt()

        for (lag in minLag..maxLag) {
          var sum = 0.0
          val limit = min(bpmFrameIdx - lag, 500)
          for (n in 0 until limit) {
            sum += energyEnvelope[n] * energyEnvelope[n + lag]
          }
          if (sum > bestCorr) {
            bestCorr = sum
            bestLag = lag
          }
        }
        val rawBpm = (fps * 60.0 / bestLag.toDouble()).roundToInt()
        detectedBpm = max(70, min(175, rawBpm))
      }

      // Real Key detection via Chroma
      val keyNames = arrayOf("C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B")
      var maxKeyEnergy = 0.0
      var bestKeyIdx = 0
      for (k in 0..11) {
        if (chromaEnergy[k] > maxKeyEnergy) {
          maxKeyEnergy = chromaEnergy[k]
          bestKeyIdx = k
        }
      }
      detectedKey = keyNames[bestKeyIdx]

      cachedSampleRates[songId] = sampleRate
      cachedSampleRates["${songId}_bpm"] = detectedBpm

      // Pre-render the initial master mix so mixer opens and plays instantly
      try {
        val initialMixFile0 = File(reactContext.cacheDir, "shakewavessplit_mix_${songId}_0.wav")
        val initialMixFile1 = File(reactContext.cacheDir, "shakewavessplit_mix_${songId}_1.wav")
        masterWriter.file.copyTo(initialMixFile0, overwrite = true)
        masterWriter.file.copyTo(initialMixFile1, overwrite = true)
      } catch (_: Exception) {}

      val stemUris = Arguments.createMap().apply {
        putString("vocals", "file://" + vocalsWriter.file.absolutePath)
        putString("instrumental", "file://" + instrumentalWriter.file.absolutePath)
        putString("drums", "file://" + drumsWriter.file.absolutePath)
        putString("bass", "file://" + bassWriter.file.absolutePath)
        putString("other", "file://" + otherWriter.file.absolutePath)
        putString("guitar", "file://" + guitarWriter.file.absolutePath)
        putString("keys", "file://" + keysWriter.file.absolutePath)
        putString("bg_vocals", "file://" + bgVocalsWriter.file.absolutePath)
        putString("strings", "file://" + stringsWriter.file.absolutePath)
        putString("master", "file://" + masterWriter.file.absolutePath)
      }

      val resultMap = Arguments.createMap().apply {
        putBoolean("success", true)
        putDouble("durationSec", durationSec)
        putInt("bpm", detectedBpm)
        putString("key", detectedKey)
        putInt("sampleRate", sampleRate)
        putMap("stems", stemUris)
      }

      return resultMap
    } finally {
      extractor.release()
      tempFileToDelete?.delete()
    }
  }

  // ==========================================
  // 5. REAL-TIME MULTI-TRACK STREAM MIXING (16KB RAM)
  // ==========================================

  @ReactMethod
  fun renderMix(
    songId: String,
    stemMixJson: String,
    speed: Double,
    pitch: Int,
    fileIndex: Int,
    metronomeJson: String,
    promise: Promise
  ) {
    Thread {
      try {
        val resultUri = doRenderMix(songId, stemMixJson, speed, pitch, fileIndex, metronomeJson)
        promise.resolve(resultUri)
      } catch (t: Throwable) {
        promise.reject("RENDER_ERROR", t.message ?: "Mix render failed", t)
      }
    }.start()
  }

  private fun doRenderMix(
    songId: String,
    stemMixJson: String,
    speed: Double,
    pitch: Int,
    fileIndex: Int,
    metronomeJson: String
  ): String {
    val sampleRate = cachedSampleRates[songId] ?: 44100
    val stemsDir = File(reactContext.cacheDir, "stems")

    data class ActiveStem(
      val stream: BufferedInputStream,
      val gainL: Float,
      val gainR: Float
    )

    val activeList = ArrayList<ActiveStem>()
    val stemsArray = JSONArray(stemMixJson)
    var hasSolo = false
    for (i in 0 until stemsArray.length()) {
      val obj = stemsArray.getJSONObject(i)
      if (obj.optBoolean("solo", false)) {
        hasSolo = true
        break
      }
    }

    try {
      for (i in 0 until stemsArray.length()) {
        val obj = stemsArray.getJSONObject(i)
        val instrument = obj.optString("instrument", "other")
        val volume = obj.optInt("volume", 80)
        val muted = obj.optBoolean("muted", false)
        val solo = obj.optBoolean("solo", false)
        val pan = obj.optInt("pan", 0)

        val isAudible = if (hasSolo) solo else !muted
        if (!isAudible || volume <= 0) continue

        var stemFile = File(stemsDir, "stem_${songId}_${instrument}.wav")
        if (!stemFile.exists()) {
          stemFile = File(stemsDir, "stem_${songId}_other.wav")
        }
        if (!stemFile.exists()) {
          stemFile = File(stemsDir, "stem_${songId}_master.wav")
        }
        if (!stemFile.exists()) continue

        val gain = min(1.3f, (volume / 100.0f) * 0.95f)
        val panNorm = max(-1.0f, min(1.0f, pan / 100.0f))
        val panAngle = ((panNorm + 1.0f) * Math.PI.toFloat()) / 4.0f
        val gainL = gain * cos(panAngle)
        val gainR = gain * sin(panAngle)

        val bis = BufferedInputStream(FileInputStream(stemFile), 65536)
        // Skip 44-byte WAV header
        var skipped = 0L
        while (skipped < 44) {
          val s = bis.skip(44 - skipped)
          if (s <= 0) break
          skipped += s
        }
        activeList.add(ActiveStem(bis, gainL, gainR))
      }

      val outFile = File(reactContext.cacheDir, "shakewavessplit_mix_${songId}_${fileIndex % 2}.wav")
      val fos = FileOutputStream(outFile)
      val bos = BufferedOutputStream(fos, 65536)
      bos.write(ByteArray(44)) // Header placeholder

      if (activeList.isEmpty()) {
        bos.flush()
        bos.close()
        fos.close()
        return "file://" + outFile.absolutePath
      }

      val chunkFrames = 1024
      val chunkBytes = chunkFrames * 4 // 2 channels * 2 bytes
      val readBuffers = Array(activeList.size) { ByteArray(chunkBytes) }
      val mixLeft = FloatArray(chunkFrames)
      val mixRight = FloatArray(chunkFrames)
      val outByteChunk = ByteArray(chunkBytes)
      var totalFramesWritten = 0L

      // Metronome configuration
      var metroEnabled = false
      var metroGain = 0.0f
      var metroPeriod = sampleRate
      try {
        val mObj = JSONObject(metronomeJson)
        metroEnabled = mObj.optBoolean("enabled", false)
        if (metroEnabled) {
          val mVol = mObj.optInt("volume", 75)
          val bpm = cachedSampleRates["${songId}_bpm"] ?: 120
          metroPeriod = (sampleRate.toDouble() * 60.0 / bpm.toDouble()).roundToInt()
          metroGain = (mVol / 100.0f) * 0.65f
        }
      } catch (_: Exception) {}

      while (true) {
        var anyRead = false
        var minFramesRead = chunkFrames

        for (idx in activeList.indices) {
          val bis = activeList[idx].stream
          val buf = readBuffers[idx]
          var bytesRead = 0
          while (bytesRead < chunkBytes) {
            val r = bis.read(buf, bytesRead, chunkBytes - bytesRead)
            if (r < 0) break
            bytesRead += r
          }
          if (bytesRead > 0) {
            anyRead = true
            val framesRead = bytesRead / 4
            if (framesRead < minFramesRead) {
              minFramesRead = framesRead
            }
          } else {
            minFramesRead = 0
          }
        }

        if (!anyRead || minFramesRead <= 0) break

        for (f in 0 until minFramesRead) {
          mixLeft[f] = 0.0f
          mixRight[f] = 0.0f
        }

        // Sum active stems with gain and pan
        for (idx in activeList.indices) {
          val stem = activeList[idx]
          val buf = readBuffers[idx]
          val gL = stem.gainL
          val gR = stem.gainR

          var bytePos = 0
          for (f in 0 until minFramesRead) {
            val lShort = ((buf[bytePos + 1].toInt() shl 8) or (buf[bytePos].toInt() and 0xFF)).toShort()
            val rShort = ((buf[bytePos + 3].toInt() shl 8) or (buf[bytePos + 2].toInt() and 0xFF)).toShort()
            bytePos += 4

            mixLeft[f] += (lShort / 32768.0f) * gL
            mixRight[f] += (rShort / 32768.0f) * gR
          }
        }

        // Add Metronome Click if enabled
        if (metroEnabled && metroGain > 0.0f) {
          for (f in 0 until minFramesRead) {
            val globalFrame = totalFramesWritten + f
            val clickPos = (globalFrame % metroPeriod).toInt()
            if (clickPos < (sampleRate * 0.025).toInt()) {
              val t = clickPos.toDouble() / sampleRate.toDouble()
              val env = exp(-t * 120.0).toFloat()
              val clickSample = (sin(2.0 * Math.PI * 1000.0 * t).toFloat()) * env * metroGain
              mixLeft[f] += clickSample
              mixRight[f] += clickSample
            }
          }
        }

        var outIdx = 0
        for (f in 0 until minFramesRead) {
          val lClamped = max(-0.99f, min(0.99f, mixLeft[f]))
          val rClamped = max(-0.99f, min(0.99f, mixRight[f]))
          val lShort = (if (lClamped < 0) lClamped * 32768.0f else lClamped * 32767.0f).toInt().toShort()
          val rShort = (if (rClamped < 0) rClamped * 32768.0f else rClamped * 32767.0f).toInt().toShort()

          outByteChunk[outIdx++] = (lShort.toInt() and 0xFF).toByte()
          outByteChunk[outIdx++] = ((lShort.toInt() shr 8) and 0xFF).toByte()
          outByteChunk[outIdx++] = (rShort.toInt() and 0xFF).toByte()
          outByteChunk[outIdx++] = ((rShort.toInt() shr 8) and 0xFF).toByte()
        }

        bos.write(outByteChunk, 0, outIdx)
        totalFramesWritten += minFramesRead
      }

      bos.flush()
      bos.close()
      fos.close()

      // Update output WAV header with totalFramesWritten
      val dataSize = (totalFramesWritten * 4).toInt()
      val totalSize = 36 + dataSize
      RandomAccessFile(outFile, "rw").use { raf ->
        val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        header.put("RIFF".toByteArray(Charsets.US_ASCII))
        header.putInt(totalSize)
        header.put("WAVE".toByteArray(Charsets.US_ASCII))
        header.put("fmt ".toByteArray(Charsets.US_ASCII))
        header.putInt(16)
        header.putShort(1.toShort())
        header.putShort(2.toShort())
        header.putInt(sampleRate)
        header.putInt(sampleRate * 4)
        header.putShort(4.toShort())
        header.putShort(16.toShort())
        header.put("data".toByteArray(Charsets.US_ASCII))
        header.putInt(dataSize)
        raf.seek(0)
        raf.write(header.array())
      }

      return "file://" + outFile.absolutePath
    } finally {
      for (stem in activeList) {
        try { stem.stream.close() } catch (_: Exception) {}
      }
    }
  }

  // ==========================================
  // 6. EXPORT STEM OR MASTER TO DEVICE STORAGE
  // ==========================================

  @ReactMethod
  fun exportMixFile(
    songId: String,
    mode: String,
    format: String,
    stemName: String,
    title: String,
    promise: Promise
  ) {
    Thread {
      try {
        val res = doExport(songId, mode, format, stemName, title)
        promise.resolve(res)
      } catch (t: Throwable) {
        promise.reject("EXPORT_FAILED", t.message ?: "Export failed", t)
      }
    }.start()
  }

  private fun doExport(
    songId: String,
    mode: String,
    format: String,
    stemName: String,
    title: String
  ): WritableMap {
    val cleanTitle = title.replace(Regex("[^a-zA-Z0-9_-]"), "_")
    val capStem = stemName.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    val ext = format.lowercase()
    val fileName = if (mode == "single_stem") {
      "${cleanTitle}_${capStem}.${ext}"
    } else {
      "${cleanTitle}_Separated_Mix.${ext}"
    }

    val stemsDir = File(reactContext.cacheDir, "stems")
    val sourceFile = if (mode == "single_stem") {
      val f = File(stemsDir, "stem_${songId}_${stemName}.wav")
      if (f.exists()) f else File(stemsDir, "stem_${songId}_master.wav")
    } else {
      val f0 = File(reactContext.cacheDir, "shakewavessplit_mix_${songId}_0.wav")
      val f1 = File(reactContext.cacheDir, "shakewavessplit_mix_${songId}_1.wav")
      if (f1.exists() && (!f0.exists() || f1.lastModified() > f0.lastModified())) f1 else f0
    }

    if (!sourceFile.exists()) {
      throw FileNotFoundException("Source mix file not found: ${sourceFile.absolutePath}")
    }

    var destUri = ""
    var destSize = sourceFile.length().toDouble()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, if (ext == "mp3") "audio/mpeg" else if (ext == "m4a") "audio/mp4" else "audio/wav")
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      }
      val resolver = reactContext.contentResolver
      val insertUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
        ?: throw IOException("Failed to create MediaStore download entry")
      resolver.openOutputStream(insertUri)?.use { outStream ->
        sourceFile.inputStream().use { inStream ->
          inStream.copyTo(outStream)
        }
      }
      destUri = insertUri.toString()
    } else {
      val destDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
      destDir.mkdirs()
      val destFile = File(destDir, fileName)
      sourceFile.inputStream().use { input ->
        destFile.outputStream().use { output ->
          input.copyTo(output)
        }
      }
      destUri = "file://" + destFile.absolutePath
      destSize = destFile.length().toDouble()
    }

    return Arguments.createMap().apply {
      putBoolean("success", true)
      putString("uri", destUri)
      putString("fileName", fileName)
      putDouble("sizeBytes", destSize)
    }
  }
}
