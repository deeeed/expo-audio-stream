package net.siteed.archiver

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import com.facebook.react.module.annotations.ReactModule
import org.apache.commons.compress.archivers.ArchiveEntry
import org.apache.commons.compress.archivers.ArchiveInputStream
import org.apache.commons.compress.archivers.ArchiveOutputStream
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorOutputStream
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.IOException
import java.util.concurrent.Executors

@ReactModule(name = ArchiverModule.NAME)
class ArchiverModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var currentArchiveInput: ArchiveInputStream<out ArchiveEntry>? = null
  private var currentArchiveOutput: ArchiveOutputStream<out ArchiveEntry>? = null
  private var currentEntry: ArchiveEntry? = null
  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun multiply(a: Double, b: Double, promise: Promise) {
    promise.resolve(a * b)
  }

  // Archive operations
  @ReactMethod
  fun openArchive(path: String, format: String, promise: Promise) {
    executor.execute {
      try {
        val file = File(path)
        if (!file.exists()) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOENT", "File does not exist: $path")
          }
          return@execute
        }

        // Close any existing archive
        closeArchiveInternal()

        // Create the appropriate archive input stream based on format
        val fileInputStream = FileInputStream(file)
        val bufferedInputStream = BufferedInputStream(fileInputStream)

        when (format) {
          "zip" -> {
            currentArchiveInput = ZipArchiveInputStream(bufferedInputStream)
          }
          "tar" -> {
            currentArchiveInput = TarArchiveInputStream(bufferedInputStream)
          }
          "tar.gz" -> {
            val gzipInput = GzipCompressorInputStream(bufferedInputStream)
            currentArchiveInput = TarArchiveInputStream(gzipInput)
          }
          "tar.bz2" -> {
            val bzip2Input = BZip2CompressorInputStream(bufferedInputStream)
            currentArchiveInput = TarArchiveInputStream(bzip2Input)
          }
          else -> {
            bufferedInputStream.close()
            fileInputStream.close()
            reactApplicationContext.runOnUiQueueThread {
              promise.reject("UNSUPPORTED", "Unsupported archive format: $format")
            }
            return@execute
          }
        }

        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to open archive: ${e.message}")
        }
      }
    }
  }

  private fun closeArchiveInternal() {
    try {
      currentArchiveInput?.close()
      currentArchiveInput = null

      currentArchiveOutput?.close()
      currentArchiveOutput = null

      currentEntry = null
    } catch (e: Exception) {
      // Just log the exception
    }
  }

  @ReactMethod
  fun closeArchive(promise: Promise) {
    executor.execute {
      try {
        closeArchiveInternal()
        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to close archive: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun getNextEntryName(promise: Promise) {
    executor.execute {
      try {
        if (currentArchiveInput == null) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOINPUT", "No archive is open")
          }
          return@execute
        }

        currentEntry = currentArchiveInput?.nextEntry
        reactApplicationContext.runOnUiQueueThread {
          if (currentEntry == null) {
            promise.resolve(null)
          } else {
            promise.resolve(currentEntry?.name)
          }
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to get next entry: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun extractEntry(entryName: String, destination: String, promise: Promise) {
    executor.execute {
      try {
        if (currentArchiveInput == null || currentEntry == null) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOINPUT", "No archive entry is selected")
          }
          return@execute
        }

        // Verify entry name matches current entry
        if (currentEntry?.name != entryName) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("EINVAL", "Entry name does not match current entry")
          }
          return@execute
        }

        // Create destination directory if it doesn't exist
        val destDir = File(destination)
        if (!destDir.exists()) {
          destDir.mkdirs()
        }

        // Determine output file path
        val outFile = File(destDir, File(entryName).name)

        // Skip directories, just create them
        if (currentEntry?.isDirectory == true) {
          outFile.mkdirs()
          reactApplicationContext.runOnUiQueueThread {
            promise.resolve(true)
          }
          return@execute
        }

        // Extract the file
        val buffer = ByteArray(8192)
        val outputStream = FileOutputStream(outFile)
        var len: Int

        while (true) {
          len = currentArchiveInput?.read(buffer) ?: -1
          if (len == -1) break
          outputStream.write(buffer, 0, len)
        }

        outputStream.close()
        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to extract entry: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun createArchive(path: String, format: String, promise: Promise) {
    executor.execute {
      try {
        // Close any existing archive
        closeArchiveInternal()

        val file = File(path)

        // Create parent directories if needed
        file.parentFile?.mkdirs()

        // Create the appropriate archive output stream based on format
        val fileOutputStream = FileOutputStream(file)
        val bufferedOutputStream = BufferedOutputStream(fileOutputStream)

        when (format) {
          "zip" -> {
            val zipOutput = ZipArchiveOutputStream(bufferedOutputStream)
            currentArchiveOutput = zipOutput
          }
          "tar" -> {
            val tarOutput = TarArchiveOutputStream(bufferedOutputStream)
            // Set the big number mode to handle larger files
            tarOutput.setBigNumberMode(TarArchiveOutputStream.BIGNUMBER_STAR)
            tarOutput.setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU)
            currentArchiveOutput = tarOutput
          }
          "tar.gz" -> {
            val gzipOutput = GzipCompressorOutputStream(bufferedOutputStream)
            val tarOutput = TarArchiveOutputStream(gzipOutput)
            // Set the big number mode to handle larger files
            tarOutput.setBigNumberMode(TarArchiveOutputStream.BIGNUMBER_STAR)
            tarOutput.setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU)
            currentArchiveOutput = tarOutput
          }
          "tar.bz2" -> {
            val bzip2Output = BZip2CompressorOutputStream(bufferedOutputStream)
            val tarOutput = TarArchiveOutputStream(bzip2Output)
            // Set the big number mode to handle larger files
            tarOutput.setBigNumberMode(TarArchiveOutputStream.BIGNUMBER_STAR)
            tarOutput.setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU)
            currentArchiveOutput = tarOutput
          }
          else -> {
            bufferedOutputStream.close()
            fileOutputStream.close()
            reactApplicationContext.runOnUiQueueThread {
              promise.reject("UNSUPPORTED", "Unsupported archive format: $format")
            }
            return@execute
          }
        }

        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to create archive: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun addFileEntry(name: String, sourcePath: String, promise: Promise) {
    executor.execute {
      try {
        if (currentArchiveOutput == null) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOOUTPUT", "No archive is being created")
          }
          return@execute
        }

        val sourceFile = File(sourcePath)
        if (!sourceFile.exists() || !sourceFile.isFile) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOENT", "Source file does not exist: $sourcePath")
          }
          return@execute
        }

        // Handle each archive type specifically to avoid type mismatch issues
        when (currentArchiveOutput) {
          is ZipArchiveOutputStream -> {
            val zipOutput = currentArchiveOutput as ZipArchiveOutputStream
            val entry = org.apache.commons.compress.archivers.zip.ZipArchiveEntry(name)
            zipOutput.putArchiveEntry(entry)
            
            // Write the file content
            val buffer = ByteArray(8192)
            val inputStream = FileInputStream(sourceFile)
            var len: Int
            
            while (true) {
              len = inputStream.read(buffer)
              if (len == -1) break
              zipOutput.write(buffer, 0, len)
            }
            
            inputStream.close()
            zipOutput.closeArchiveEntry()
          }
          is TarArchiveOutputStream -> {
            val tarOutput = currentArchiveOutput as TarArchiveOutputStream
            val entry = org.apache.commons.compress.archivers.tar.TarArchiveEntry(name)
            entry.size = sourceFile.length()
            tarOutput.putArchiveEntry(entry)
            
            // Write the file content
            val buffer = ByteArray(8192)
            val inputStream = FileInputStream(sourceFile)
            var len: Int
            
            while (true) {
              len = inputStream.read(buffer)
              if (len == -1) break
              tarOutput.write(buffer, 0, len)
            }
            
            inputStream.close()
            tarOutput.closeArchiveEntry()
          }
          else -> {
            reactApplicationContext.runOnUiQueueThread {
              promise.reject("UNSUPPORTED", "Unsupported archive type")
            }
            return@execute
          }
        }

        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to add file entry: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun addDirectoryEntry(name: String, promise: Promise) {
    executor.execute {
      try {
        if (currentArchiveOutput == null) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOOUTPUT", "No archive is being created")
          }
          return@execute
        }

        // Ensure the directory name ends with a slash
        val dirName = if (name.endsWith("/")) name else "$name/"

        // Handle each archive type specifically to avoid type mismatch issues
        when (currentArchiveOutput) {
          is ZipArchiveOutputStream -> {
            val zipOutput = currentArchiveOutput as ZipArchiveOutputStream
            val entry = org.apache.commons.compress.archivers.zip.ZipArchiveEntry(dirName)
            zipOutput.putArchiveEntry(entry)
            zipOutput.closeArchiveEntry()
          }
          is TarArchiveOutputStream -> {
            val tarOutput = currentArchiveOutput as TarArchiveOutputStream
            val entry = org.apache.commons.compress.archivers.tar.TarArchiveEntry(dirName)
            tarOutput.putArchiveEntry(entry)
            tarOutput.closeArchiveEntry()
          }
          else -> {
            reactApplicationContext.runOnUiQueueThread {
              promise.reject("UNSUPPORTED", "Unsupported archive type")
            }
            return@execute
          }
        }

        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to add directory entry: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun finalizeArchive(promise: Promise) {
    executor.execute {
      try {
        if (currentArchiveOutput == null) {
          reactApplicationContext.runOnUiQueueThread {
            promise.reject("ENOOUTPUT", "No archive is being created")
          }
          return@execute
        }

        // Handle each archive type specifically
        when (currentArchiveOutput) {
          is ZipArchiveOutputStream -> {
            val zipOutput = currentArchiveOutput as ZipArchiveOutputStream
            zipOutput.finish()
            zipOutput.close()
          }
          is TarArchiveOutputStream -> {
            val tarOutput = currentArchiveOutput as TarArchiveOutputStream
            tarOutput.finish()
            tarOutput.close()
          }
          else -> {
            // Just try to close it generically
            currentArchiveOutput?.finish()
            currentArchiveOutput?.close()
          }
        }
        
        currentArchiveOutput = null

        reactApplicationContext.runOnUiQueueThread {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        reactApplicationContext.runOnUiQueueThread {
          promise.reject("EUNKNOWN", "Failed to finalize archive: ${e.message}")
        }
      }
    }
  }

  @ReactMethod
  fun getSupportedFormats(promise: Promise) {
    val formats = Arguments.createArray()
    formats.pushString("zip")
    formats.pushString("tar")
    formats.pushString("tar.gz")
    formats.pushString("tar.bz2")
    promise.resolve(formats)
  }

  companion object {
    const val NAME = "Archiver"
  }
}
