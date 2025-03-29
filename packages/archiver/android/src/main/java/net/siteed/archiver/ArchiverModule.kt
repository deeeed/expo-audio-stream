package net.siteed.archiver

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
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
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.IOException

@ReactModule(name = ArchiverModule.NAME)
class ArchiverModule(reactContext: ReactApplicationContext) :
  NativeArchiverSpec(reactContext) {

  private var currentArchiveInput: ArchiveInputStream? = null
  private var currentArchiveOutput: ArchiveOutputStream? = null
  private var currentEntry: ArchiveEntry? = null

  override fun getName(): String {
    return NAME
  }

  // Legacy method
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  // Archive operations
  @ReactMethod
  override fun openArchive(path: String, format: String, promise: Promise) {
    try {
      val file = File(path)
      if (!file.exists()) {
        promise.reject("ENOENT", "File does not exist: $path")
        return
      }

      // Close any existing archive
      closeArchive(Promise())

      // Create the appropriate archive input stream based on format
      val fileInputStream = FileInputStream(file)
      val bufferedInputStream = BufferedInputStream(fileInputStream)

      currentArchiveInput = when (format) {
        "zip" -> ZipArchiveInputStream(bufferedInputStream)
        "tar" -> TarArchiveInputStream(bufferedInputStream)
        "tar.gz" -> TarArchiveInputStream(GzipCompressorInputStream(bufferedInputStream))
        "tar.bz2" -> TarArchiveInputStream(BZip2CompressorInputStream(bufferedInputStream))
        else -> {
          bufferedInputStream.close()
          fileInputStream.close()
          promise.reject("UNSUPPORTED", "Unsupported archive format: $format")
          return
        }
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to open archive: ${e.message}")
    }
  }

  @ReactMethod
  override fun closeArchive(promise: Promise) {
    try {
      currentArchiveInput?.close()
      currentArchiveInput = null

      currentArchiveOutput?.close()
      currentArchiveOutput = null

      currentEntry = null

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to close archive: ${e.message}")
    }
  }

  @ReactMethod
  override fun getNextEntryName(promise: Promise) {
    try {
      if (currentArchiveInput == null) {
        promise.reject("ENOINPUT", "No archive is open")
        return
      }

      currentEntry = currentArchiveInput?.nextEntry
      if (currentEntry == null) {
        promise.resolve(null)
      } else {
        promise.resolve(currentEntry?.name)
      }
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to get next entry: ${e.message}")
    }
  }

  @ReactMethod
  override fun extractEntry(entryName: String, destination: String, promise: Promise) {
    try {
      if (currentArchiveInput == null || currentEntry == null) {
        promise.reject("ENOINPUT", "No archive entry is selected")
        return
      }

      // Verify entry name matches current entry
      if (currentEntry?.name != entryName) {
        promise.reject("EINVAL", "Entry name does not match current entry")
        return
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
        promise.resolve(true)
        return
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
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to extract entry: ${e.message}")
    }
  }

  @ReactMethod
  override fun createArchive(path: String, format: String, promise: Promise) {
    try {
      // Close any existing archive
      closeArchive(Promise())

      val file = File(path)

      // Create parent directories if needed
      file.parentFile?.mkdirs()

      // Create the appropriate archive output stream based on format
      val fileOutputStream = FileOutputStream(file)
      val bufferedOutputStream = BufferedOutputStream(fileOutputStream)

      currentArchiveOutput = when (format) {
        "zip" -> ZipArchiveOutputStream(bufferedOutputStream)
        "tar" -> TarArchiveOutputStream(bufferedOutputStream)
        "tar.gz" -> TarArchiveOutputStream(GzipCompressorOutputStream(bufferedOutputStream))
        "tar.bz2" -> TarArchiveOutputStream(BZip2CompressorOutputStream(bufferedOutputStream))
        else -> {
          bufferedOutputStream.close()
          fileOutputStream.close()
          promise.reject("UNSUPPORTED", "Unsupported archive format: $format")
          return
        }
      }

      // For TAR archives, set the big number mode to handle larger files
      if (format.startsWith("tar")) {
        (currentArchiveOutput as TarArchiveOutputStream).setBigNumberMode(TarArchiveOutputStream.BIGNUMBER_STAR)
        (currentArchiveOutput as TarArchiveOutputStream).setLongFileMode(TarArchiveOutputStream.LONGFILE_GNU)
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to create archive: ${e.message}")
    }
  }

  @ReactMethod
  override fun addFileEntry(name: String, sourcePath: String, promise: Promise) {
    try {
      if (currentArchiveOutput == null) {
        promise.reject("ENOOUTPUT", "No archive is being created")
        return
      }

      val sourceFile = File(sourcePath)
      if (!sourceFile.exists() || !sourceFile.isFile) {
        promise.reject("ENOENT", "Source file does not exist: $sourcePath")
        return
      }

      // Create the appropriate entry based on archive type
      val entry = when (currentArchiveOutput) {
        is ZipArchiveOutputStream -> org.apache.commons.compress.archivers.zip.ZipArchiveEntry(name)
        is TarArchiveOutputStream -> org.apache.commons.compress.archivers.tar.TarArchiveEntry(name)
        else -> {
          promise.reject("UNSUPPORTED", "Unsupported archive type")
          return
        }
      }

      // Set file size and other properties
      if (entry is org.apache.commons.compress.archivers.tar.TarArchiveEntry) {
        entry.size = sourceFile.length()
      }

      // Add the entry to the archive
      currentArchiveOutput?.putArchiveEntry(entry)

      // Write the file content
      val buffer = ByteArray(8192)
      val inputStream = FileInputStream(sourceFile)
      var len: Int

      while (true) {
        len = inputStream.read(buffer)
        if (len == -1) break
        currentArchiveOutput?.write(buffer, 0, len)
      }

      inputStream.close()
      currentArchiveOutput?.closeArchiveEntry()

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to add file entry: ${e.message}")
    }
  }

  @ReactMethod
  override fun addDirectoryEntry(name: String, promise: Promise) {
    try {
      if (currentArchiveOutput == null) {
        promise.reject("ENOOUTPUT", "No archive is being created")
        return
      }

      // Ensure the directory name ends with a slash
      val dirName = if (name.endsWith("/")) name else "$name/"

      // Create the appropriate entry based on archive type
      val entry = when (currentArchiveOutput) {
        is ZipArchiveOutputStream -> org.apache.commons.compress.archivers.zip.ZipArchiveEntry(dirName)
        is TarArchiveOutputStream -> org.apache.commons.compress.archivers.tar.TarArchiveEntry(dirName)
        else -> {
          promise.reject("UNSUPPORTED", "Unsupported archive type")
          return
        }
      }

      // Add the entry to the archive
      currentArchiveOutput?.putArchiveEntry(entry)
      currentArchiveOutput?.closeArchiveEntry()

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to add directory entry: ${e.message}")
    }
  }

  @ReactMethod
  override fun finalizeArchive(promise: Promise) {
    try {
      if (currentArchiveOutput == null) {
        promise.reject("ENOOUTPUT", "No archive is being created")
        return
      }

      currentArchiveOutput?.finish()
      currentArchiveOutput?.close()
      currentArchiveOutput = null

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("EUNKNOWN", "Failed to finalize archive: ${e.message}")
    }
  }

  @ReactMethod
  override fun getSupportedFormats(promise: Promise) {
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
