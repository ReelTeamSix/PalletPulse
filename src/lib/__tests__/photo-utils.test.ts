// Photo Utils Tests
import {
  calculateResizedDimensions,
  generateStoragePath,
  estimateCompressedSize,
  formatFileSize,
} from '../photo-utils';

describe('calculateResizedDimensions', () => {
  describe('when image is smaller than max dimensions', () => {
    it('should return original dimensions', () => {
      const result = calculateResizedDimensions(400, 300, 800, 800);
      expect(result).toEqual({ width: 400, height: 300 });
    });

    it('should return original dimensions when exactly at max', () => {
      const result = calculateResizedDimensions(800, 800, 800, 800);
      expect(result).toEqual({ width: 800, height: 800 });
    });
  });

  describe('when image is larger than max dimensions', () => {
    it('should scale down landscape image maintaining aspect ratio', () => {
      const result = calculateResizedDimensions(1600, 1200, 800, 800);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600); // 800 / (1600/1200) = 600
    });

    it('should scale down portrait image maintaining aspect ratio', () => {
      const result = calculateResizedDimensions(1200, 1600, 800, 800);
      expect(result.width).toBe(600); // 800 * (1200/1600) = 600
      expect(result.height).toBe(800);
    });

    it('should scale down square image to max dimensions', () => {
      const result = calculateResizedDimensions(1600, 1600, 800, 800);
      expect(result.width).toBe(800);
      expect(result.height).toBe(800);
    });

    it('should handle very wide images', () => {
      const result = calculateResizedDimensions(3000, 500, 800, 800);
      expect(result.width).toBe(800);
      expect(result.height).toBe(133); // 800 / (3000/500) = 133.33 rounded
    });

    it('should handle very tall images', () => {
      const result = calculateResizedDimensions(500, 3000, 800, 800);
      expect(result.width).toBe(133); // 800 * (500/3000) = 133.33 rounded
      expect(result.height).toBe(800);
    });
  });

  describe('edge cases', () => {
    it('should handle 1:1 aspect ratio', () => {
      const result = calculateResizedDimensions(1000, 1000, 800, 800);
      expect(result.width).toBe(800);
      expect(result.height).toBe(800);
    });

    it('should handle small images', () => {
      const result = calculateResizedDimensions(100, 100, 800, 800);
      expect(result).toEqual({ width: 100, height: 100 });
    });
  });
});

describe('generateStoragePath', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate path with userId, itemId, timestamp, and extension', () => {
    const result = generateStoragePath('user123', 'item456', 'photo.jpg');
    expect(result).toBe('user123/item456/1704067200000.jpg');
  });

  it('should extract extension from filename', () => {
    const result = generateStoragePath('user123', 'item456', 'image.png');
    expect(result).toBe('user123/item456/1704067200000.png');
  });

  it('should handle filename with multiple dots', () => {
    const result = generateStoragePath('user123', 'item456', 'my.photo.image.webp');
    expect(result).toBe('user123/item456/1704067200000.webp');
  });

  it('should default to jpg if no extension', () => {
    const result = generateStoragePath('user123', 'item456', 'noextension');
    expect(result).toBe('user123/item456/1704067200000.jpg');
  });

  it('should handle UUID-style IDs', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const itemId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const result = generateStoragePath(userId, itemId, 'photo.heic');
    expect(result).toBe(`${userId}/${itemId}/1704067200000.heic`);
  });
});

describe('estimateCompressedSize', () => {
  it('should estimate size for small image (no resize needed)', () => {
    const result = estimateCompressedSize(400, 300);
    // 400 * 300 = 120,000 pixels * 0.4 * 0.5 = 24,000 bytes
    expect(result).toBe(24000);
  });

  it('should estimate size for large image (resize needed)', () => {
    const result = estimateCompressedSize(1600, 1200);
    // Resized to 800x600 = 480,000 pixels * 0.4 * 0.5 = 96,000 bytes
    expect(result).toBe(96000);
  });

  it('should estimate size for max dimension image', () => {
    const result = estimateCompressedSize(800, 800);
    // 800 * 800 = 640,000 pixels * 0.4 * 0.5 = 128,000 bytes
    expect(result).toBe(128000);
  });

  it('should estimate size for portrait image', () => {
    const result = estimateCompressedSize(600, 800);
    // 600 * 800 = 480,000 pixels * 0.4 * 0.5 = 96,000 bytes
    expect(result).toBe(96000);
  });

  it('should handle very large images that get resized', () => {
    const result = estimateCompressedSize(4000, 3000);
    // Resized to 800x600 = 480,000 pixels * 0.4 * 0.5 = 96,000 bytes
    expect(result).toBe(96000);
  });
});

describe('formatFileSize', () => {
  describe('bytes', () => {
    it('should format small sizes in bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });
  });

  describe('kilobytes', () => {
    it('should format sizes in KB', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10.0 KB');
      expect(formatFileSize(102400)).toBe('100.0 KB');
    });

    it('should handle fractional KB values', () => {
      expect(formatFileSize(1500)).toBe('1.5 KB');
      expect(formatFileSize(2560)).toBe('2.5 KB');
    });
  });

  describe('megabytes', () => {
    it('should format sizes in MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 10)).toBe('10.0 MB');
    });

    it('should handle large file sizes', () => {
      expect(formatFileSize(1024 * 1024 * 100)).toBe('100.0 MB');
      expect(formatFileSize(1024 * 1024 * 500)).toBe('500.0 MB');
    });
  });

  describe('edge cases', () => {
    it('should handle boundary between KB and MB', () => {
      expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('should handle boundary between B and KB', () => {
      expect(formatFileSize(1023)).toBe('1023 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });
  });
});
