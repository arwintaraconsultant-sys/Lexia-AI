
/**
 * Compresses an image based on max dimension and quality.
 * Returns a base64 string.
 */
export const compressImage = async (dataUrl: string, maxDimension: number = 1000, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
  });
};

/**
 * Checks the size of a base64 string in bytes.
 */
export const getBase64Size = (base64String: string): number => {
  const base64Content = base64String.includes(',') ? base64String.split(',')[1] : base64String;
  const padding = (base64Content.match(/=/g) || []).length;
  return (base64Content.length * 3) / 4 - padding;
};
