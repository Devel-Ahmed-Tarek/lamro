<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class ImageVariantService
{
    /**
     * Create a max-edge WebP/JPEG thumbnail next to the original when GD is available.
     *
     * @return string|null Relative disk path of the variant
     */
    public function makeThumbnail(string $disk, string $path, int $maxEdge = 1200): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }

        $absolute = Storage::disk($disk)->path($path);
        if (! is_file($absolute)) {
            return null;
        }

        $binary = @file_get_contents($absolute);
        if ($binary === false) {
            return null;
        }
        $image = @imagecreatefromstring($binary);
        if (! $image) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width < 1 || $height < 1) {
            imagedestroy($image);

            return null;
        }

        $scale = min(1, $maxEdge / max($width, $height));
        $targetW = max(1, (int) round($width * $scale));
        $targetH = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($targetW, $targetH);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetW, $targetH, $width, $height);

        $variantPath = preg_replace('/(\.[^.]+)?$/', '_thumb.webp', $path) ?: ($path.'_thumb.webp');
        $variantAbsolute = Storage::disk($disk)->path($variantPath);
        @mkdir(dirname($variantAbsolute), 0755, true);

        $ok = false;
        if (function_exists('imagewebp')) {
            $ok = imagewebp($canvas, $variantAbsolute, 82);
        }
        if (! $ok) {
            $variantPath = preg_replace('/(\.[^.]+)?$/', '_thumb.jpg', $path) ?: ($path.'_thumb.jpg');
            $variantAbsolute = Storage::disk($disk)->path($variantPath);
            $ok = imagejpeg($canvas, $variantAbsolute, 85);
        }

        imagedestroy($canvas);
        imagedestroy($image);

        return $ok ? $variantPath : null;
    }
}
