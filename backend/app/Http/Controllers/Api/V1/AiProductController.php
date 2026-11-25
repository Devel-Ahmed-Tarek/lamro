<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AiProductService;
use App\Support\Locales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiProductController extends Controller
{
    public function __construct(private AiProductService $ai) {}

    public function config(): JsonResponse
    {
        return response()->json([
            'data' => [
                'provider' => $this->ai->provider(),
                'demo' => $this->ai->demoMode(),
                'locales' => Locales::all(),
                'labels' => config('i18n.labels', []),
            ],
        ]);
    }

    public function draft(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'min:8', 'max:8000'],
            'source_locale' => ['nullable', 'string', 'in:'.implode(',', Locales::all())],
        ]);

        $draft = $this->ai->draftFromDescription(
            $data['description'],
            $data['source_locale'] ?? 'en',
        );

        return response()->json(['data' => $draft]);
    }

    public function translate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_locale' => ['nullable', 'string', 'in:'.implode(',', Locales::all())],
            'name' => ['nullable', 'array'],
            'summary' => ['nullable', 'array'],
            'notes' => ['nullable', 'array'],
            'specs' => ['nullable', 'array'],
            'specs.*.label' => ['nullable', 'array'],
            'specs.*.value' => ['nullable', 'string', 'max:255'],
        ]);

        $translated = $this->ai->translateProductCopy(
            $data,
            $data['source_locale'] ?? 'en',
        );

        return response()->json(['data' => $translated]);
    }
}
