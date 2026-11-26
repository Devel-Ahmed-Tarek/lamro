<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class AiSettingsController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload(AiSetting::current())]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['sometimes', Rule::in(AiSetting::providers())],
            'groq_key' => ['nullable', 'string', 'max:500'],
            'groq_model' => ['nullable', 'string', 'max:120'],
            'gemini_key' => ['nullable', 'string', 'max:500'],
            'gemini_model' => ['nullable', 'string', 'max:120'],
            'openai_key' => ['nullable', 'string', 'max:500'],
            'openai_model' => ['nullable', 'string', 'max:120'],
            'clear_groq_key' => ['sometimes', 'boolean'],
            'clear_gemini_key' => ['sometimes', 'boolean'],
            'clear_openai_key' => ['sometimes', 'boolean'],
        ]);

        $settings = AiSetting::current();

        if (array_key_exists('provider', $data)) {
            $settings->provider = $data['provider'];
        }

        foreach (['groq', 'gemini', 'openai'] as $provider) {
            $modelField = $provider.'_model';
            $keyField = $provider.'_key';
            $clearField = 'clear_'.$keyField;

            if (array_key_exists($modelField, $data)) {
                $settings->{$modelField} = $this->normalize($data[$modelField]);
            }
            if (! empty($data[$clearField])) {
                $settings->{$keyField} = null;
            } elseif (! empty($data[$keyField])) {
                $settings->{$keyField} = trim((string) $data[$keyField]);
            }
        }

        $settings->save();
        $this->audit->log($request->user(), 'ai.settings_updated', $settings, [
            'provider' => $settings->provider,
        ]);

        return response()->json(['data' => $this->payload($settings->fresh() ?? AiSetting::current())]);
    }

    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['nullable', Rule::in(['groq', 'gemini', 'openai'])],
        ]);

        $settings = AiSetting::current();
        $provider = $data['provider'] ?? $settings->resolvedProvider();
        if ($provider === 'demo') {
            return response()->json([
                'data' => [
                    'ok' => false,
                    'message' => 'Select Groq, Gemini, or OpenAI and save an API key first.',
                ],
            ], 422);
        }

        $key = $settings->keyFor($provider);
        if ($key === '') {
            return response()->json([
                'data' => [
                    'ok' => false,
                    'message' => 'API key is missing for '.$provider.'.',
                ],
            ], 422);
        }

        try {
            $result = match ($provider) {
                'groq' => $this->testGroq($key, $settings->modelFor('groq')),
                'gemini' => $this->testGemini($key, $settings->modelFor('gemini')),
                'openai' => $this->testOpenAi($key, $settings->modelFor('openai')),
                default => throw new \RuntimeException('Unsupported provider'),
            };

            $this->audit->log($request->user(), 'ai.connection_tested', $settings, [
                'provider' => $provider,
            ]);

            return response()->json([
                'data' => array_merge(['ok' => true, 'provider' => $provider], $result),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'data' => [
                    'ok' => false,
                    'provider' => $provider,
                    'message' => $e->getMessage(),
                ],
            ], 422);
        }
    }

    /** @return array{message:string,model:string} */
    private function testGroq(string $key, string $model): array
    {
        $response = Http::timeout(30)
            ->withToken($key)
            ->acceptJson()
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => $model,
                'temperature' => 0,
                'max_tokens' => 16,
                'messages' => [
                    ['role' => 'user', 'content' => 'Reply with the single word: ok'],
                ],
            ]);
        if (! $response->successful()) {
            throw new \RuntimeException('Groq error: '.$response->status().' '.$response->body());
        }

        return [
            'message' => 'Groq connection OK.',
            'model' => $model,
        ];
    }

    /** @return array{message:string,model:string} */
    private function testGemini(string $key, string $model): array
    {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'.$model.':generateContent?key='.urlencode($key);
        $response = Http::timeout(30)
            ->acceptJson()
            ->post($url, [
                'contents' => [[
                    'parts' => [['text' => 'Reply with the single word: ok']],
                ]],
            ]);
        if (! $response->successful()) {
            throw new \RuntimeException('Gemini error: '.$response->status().' '.$response->body());
        }

        return [
            'message' => 'Gemini connection OK.',
            'model' => $model,
        ];
    }

    /** @return array{message:string,model:string} */
    private function testOpenAi(string $key, string $model): array
    {
        $response = Http::timeout(30)
            ->withToken($key)
            ->acceptJson()
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'temperature' => 0,
                'max_tokens' => 16,
                'messages' => [
                    ['role' => 'user', 'content' => 'Reply with the single word: ok'],
                ],
            ]);
        if (! $response->successful()) {
            throw new \RuntimeException('OpenAI error: '.$response->status().' '.$response->body());
        }

        return [
            'message' => 'OpenAI connection OK.',
            'model' => $model,
        ];
    }

    private function normalize(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /** @return array<string, mixed> */
    private function payload(AiSetting $settings): array
    {
        return [
            'provider' => $settings->provider ?: 'demo',
            'active_provider' => $settings->resolvedProvider(),
            'groq' => [
                'key_set' => $settings->keyFor('groq') !== '',
                'key_hint' => AiSetting::mask($settings->keyFor('groq') ?: null),
                'model' => $settings->modelFor('groq'),
                'docs_url' => 'https://console.groq.com/keys',
                'default_model' => 'llama-3.1-8b-instant',
            ],
            'gemini' => [
                'key_set' => $settings->keyFor('gemini') !== '',
                'key_hint' => AiSetting::mask($settings->keyFor('gemini') ?: null),
                'model' => $settings->modelFor('gemini'),
                'docs_url' => 'https://aistudio.google.com/apikey',
                'default_model' => 'gemini-2.0-flash',
            ],
            'openai' => [
                'key_set' => $settings->keyFor('openai') !== '',
                'key_hint' => AiSetting::mask($settings->keyFor('openai') ?: null),
                'model' => $settings->modelFor('openai'),
                'docs_url' => 'https://platform.openai.com/api-keys',
                'default_model' => 'gpt-4o-mini',
            ],
            'setup' => [
                'steps' => [
                    [
                        'title' => 'Choose a provider',
                        'detail' => 'Pick Groq (fast/cheap), Gemini (Google), or OpenAI. Demo works without keys for local testing only.',
                    ],
                    [
                        'title' => 'Create an API key',
                        'detail' => 'Open the provider link, create a secret key, then paste it here. Leave blank to keep a saved key.',
                    ],
                    [
                        'title' => 'Set the model (optional)',
                        'detail' => 'Defaults work out of the box. Change only if your account uses a different model id.',
                    ],
                    [
                        'title' => 'Save and test',
                        'detail' => 'Save settings, then Test connection. Product draft/translate will use the active provider.',
                    ],
                ],
            ],
        ];
    }
}
