/**
 * Upload error codes.
 */
export enum UploadErrorCode {
  UNKNOWN = "UNKNOWN",

  EMPTY_FILE = "EMPTY_FILE",

  INVALID_IMAGE = "INVALID_IMAGE",

  UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE",

  FILE_TOO_LARGE = "FILE_TOO_LARGE",

  IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE",

  INVALID_DIMENSIONS = "INVALID_DIMENSIONS",

  PROCESSING_FAILED = "PROCESSING_FAILED",

  UPLOAD_FAILED = "UPLOAD_FAILED",

  NETWORK_ERROR = "NETWORK_ERROR",

  CANCELLED = "CANCELLED",
}

/**
 * Base upload error.
 */
export class UploadError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Validation
 */
export class EmptyFileError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.EMPTY_FILE,
      "The selected file is empty.",
    );
  }
}

export class UnsupportedImageError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.UNSUPPORTED_TYPE,
      "Unsupported image format.",
    );
  }
}

export class InvalidImageError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.INVALID_IMAGE,
      "The image is invalid or corrupted.",
    );
  }
}

export class FileTooLargeError extends UploadError {
  constructor(maxSize: string) {
    super(
      UploadErrorCode.FILE_TOO_LARGE,
      `Maximum upload size is ${maxSize}.`,
    );
  }
}

export class ImageTooLargeError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.IMAGE_TOO_LARGE,
      "Image resolution is too large.",
    );
  }
}

export class InvalidDimensionsError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.INVALID_DIMENSIONS,
      "Image dimensions are invalid.",
    );
  }
}

/**
 * Processing
 */
export class ImageProcessingError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.PROCESSING_FAILED,
      "Unable to process image.",
    );
  }
}

/**
 * Upload
 */
export class UploadFailedError extends UploadError {
  constructor(message = "Upload failed.") {
    super(
      UploadErrorCode.UPLOAD_FAILED,
      message,
    );
  }
}

export class NetworkUploadError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.NETWORK_ERROR,
      "Network error during upload.",
    );
  }
}

export class UploadCancelledError extends UploadError {
  constructor() {
    super(
      UploadErrorCode.CANCELLED,
      "Upload cancelled.",
    );
  }
}
