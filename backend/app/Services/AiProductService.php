<?php

namespace App\Services;

use App\Support\Locales;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AiProductService
{
    public function provider(): string
    {
        $configured = strtolower((string) config('services.ai.provider', 'demo'));
        if (in_array($configured, ['groq', 'gemini', 'openai'], true) && $this->apiKey($configured)) {
            return $configured;
        }

        return 'demo';
    }

    public function demoMode(): bool
    {
        return $this->provider() === 'demo';
    }

    /**
     * Build a product draft from free-text description.
     *
     * @return array{
     *   source_locale: string,
     *   name: array<string, string>,
     *   summary: array<string, string>,
     *   notes: array<string, string>,
     *   part_number: string|null,
     *   model: string|null,
     *   sku: string|null,
     *   condition: string,
     *   testing: string,
     *   weight: string|null,
     *   dimensions: string|null,
     *   specs: list<array{label: array<string, string>, value: string}>,
     *   provider: string
     * }
     */
    public function draftFromDescription(string $description, string $sourceLocale = 'en'): array
    {
        $sourceLocale = Locales::isValid($sourceLocale) ? $sourceLocale : Locales::fallback();
        $description = trim($description);
        if ($description === '') {
            throw ValidationException::withMessages(['description' => ['Description is required.']]);
        }

        $draft = match ($this->provider()) {
            'groq' => $this->draftViaGroq($description, $sourceLocale),
            'gemini' => $this->draftViaGemini($description, $sourceLocale),
            'openai' => $this->draftViaOpenAi($description, $sourceLocale),
            default => $this->draftDemo($description, $sourceLocale),
        };

        return $this->normalizeDraft($draft, $sourceLocale);
    }

    /**
     * Translate product copy maps into all supported locales.
     *
     * @param  array{
     *   name?: array<string, string>,
     *   summary?: array<string, string>,
     *   notes?: array<string, string>,
     *   specs?: list<array{label?: array<string, string>, value?: string}>
     * }  $payload
     * @return array{
     *   name: array<string, string>,
     *   summary: array<string, string>,
     *   notes: array<string, string>,
     *   specs: list<array{label: array<string, string>, value: string}>,
     *   provider: string
     * }
     */
    public function translateProductCopy(array $payload, string $sourceLocale = 'en'): array
    {
        $sourceLocale = Locales::isValid($sourceLocale) ? $sourceLocale : Locales::fallback();
        $name = Locales::normalize($payload['name'] ?? []);
        $summary = Locales::normalize($payload['summary'] ?? []);
        $notes = Locales::normalize($payload['notes'] ?? []);
        $specs = [];
        foreach ($payload['specs'] ?? [] as $spec) {
            if (! is_array($spec)) {
                continue;
            }
            $specs[] = [
                'label' => Locales::normalize($spec['label'] ?? []),
                'value' => (string) ($spec['value'] ?? ''),
            ];
        }

        $sourceName = Locales::pick($name, $sourceLocale);
        $sourceSummary = Locales::pick($summary, $sourceLocale);
        $sourceNotes = Locales::pick($notes, $sourceLocale);
        if ($sourceName === '' && $sourceSummary === '') {
            throw ValidationException::withMessages(['name' => ['Source text missing for translation.']]);
        }

        $translated = match ($this->provider()) {
            'groq', 'gemini', 'openai' => $this->translateViaLlm(
                $this->provider(),
                $sourceLocale,
                $sourceName,
                $sourceSummary,
                $sourceNotes,
                $specs,
            ),
            default => $this->translateDemo($sourceLocale, $sourceName, $sourceSummary, $sourceNotes, $specs),
        };

        return [
            'name' => Locales::normalize($translated['name'] ?? [], $sourceName),
            'summary' => Locales::normalize($translated['summary'] ?? [], $sourceSummary),
            'notes' => Locales::normalize($translated['notes'] ?? [], $sourceNotes),
            'specs' => $translated['specs'] ?? $specs,
            'provider' => $this->provider(),
        ];
    }

    /**
     * Translate brand/category copy + SEO fields into all locales.
     *
     * @param  array{
     *   name?: array<string, string>,
     *   description?: array<string, string>,
     *   seo_title?: array<string, string>,
     *   seo_description?: array<string, string>,
     *   seo_keywords?: array<string, string>
     * }  $payload
     * @return array{
     *   name: array<string, string>,
     *   description: array<string, string>,
     *   seo_title: array<string, string>,
     *   seo_description: array<string, string>,
     *   seo_keywords: array<string, string>,
     *   provider: string
     * }
     */
    public function translateTaxonomyCopy(array $payload, string $sourceLocale = 'en'): array
    {
        $sourceLocale = Locales::isValid($sourceLocale) ? $sourceLocale : Locales::fallback();
        $name = Locales::normalize($payload['name'] ?? []);
        $description = Locales::normalize($payload['description'] ?? []);
        $seoTitle = Locales::normalize($payload['seo_title'] ?? []);
        $seoDescription = Locales::normalize($payload['seo_description'] ?? []);
        $seoKeywords = Locales::normalize($payload['seo_keywords'] ?? []);

        $sourceName = Locales::pick($name, $sourceLocale);
        $sourceDescription = Locales::pick($description, $sourceLocale);
        $sourceSeoTitle = Locales::pick($seoTitle, $sourceLocale);
        $sourceSeoDescription = Locales::pick($seoDescription, $sourceLocale);
        $sourceSeoKeywords = Locales::pick($seoKeywords, $sourceLocale);

        if ($sourceName === '' && $sourceDescription === '' && $sourceSeoTitle === '') {
            throw ValidationException::withMessages(['name' => ['Source text missing for translation.']]);
        }

        $translated = match ($this->provider()) {
            'groq', 'gemini', 'openai' => $this->translateTaxonomyViaLlm(
                $this->provider(),
                $sourceLocale,
                $sourceName,
                $sourceDescription,
                $sourceSeoTitle,
                $sourceSeoDescription,
                $sourceSeoKeywords,
            ),
            default => $this->translateTaxonomyDemo(
                $sourceLocale,
                $sourceName,
                $sourceDescription,
                $sourceSeoTitle,
                $sourceSeoDescription,
                $sourceSeoKeywords,
            ),
        };

        return [
            'name' => Locales::normalize($translated['name'] ?? [], $sourceName),
            'description' => Locales::normalize($translated['description'] ?? [], $sourceDescription),
            'seo_title' => Locales::normalize($translated['seo_title'] ?? [], $sourceSeoTitle),
            'seo_description' => Locales::normalize($translated['seo_description'] ?? [], $sourceSeoDescription),
            'seo_keywords' => Locales::normalize($translated['seo_keywords'] ?? [], $sourceSeoKeywords),
            'provider' => $this->provider(),
        ];
    }

    /**
     * @return array{
     *   name: array<string, string>,
     *   description: array<string, string>,
     *   seo_title: array<string, string>,
     *   seo_description: array<string, string>,
     *   seo_keywords: array<string, string>
     * }
     */
    private function translateTaxonomyDemo(
        string $sourceLocale,
        string $sourceName,
        string $sourceDescription,
        string $sourceSeoTitle,
        string $sourceSeoDescription,
        string $sourceSeoKeywords,
    ): array {
        $name = Locales::normalize([]);
        $description = Locales::normalize([]);
        $seoTitle = Locales::normalize([]);
        $seoDescription = Locales::normalize([]);
        $seoKeywords = Locales::normalize([]);
        foreach (Locales::all() as $locale) {
            // Brand/category names are often proper nouns — keep identical unless empty.
            $name[$locale] = $sourceName;
            $prefix = $locale === $sourceLocale ? '' : '['.$locale.'] ';
            $description[$locale] = $sourceDescription === '' ? '' : $prefix.$sourceDescription;
            $seoTitle[$locale] = $sourceSeoTitle === '' ? '' : $prefix.$sourceSeoTitle;
            $seoDescription[$locale] = $sourceSeoDescription === '' ? '' : $prefix.$sourceSeoDescription;
            $seoKeywords[$locale] = $sourceSeoKeywords === '' ? '' : $prefix.$sourceSeoKeywords;
        }

        return [
            'name' => $name,
            'description' => $description,
            'seo_title' => $seoTitle,
            'seo_description' => $seoDescription,
            'seo_keywords' => $seoKeywords,
        ];
    }

    /**
     * @return array{
     *   name: array<string, string>,
     *   description: array<string, string>,
     *   seo_title: array<string, string>,
     *   seo_description: array<string, string>,
     *   seo_keywords: array<string, string>
     * }
     */
    private function translateTaxonomyViaLlm(
        string $provider,
        string $sourceLocale,
        string $sourceName,
        string $sourceDescription,
        string $sourceSeoTitle,
        string $sourceSeoDescription,
        string $sourceSeoKeywords,
    ): array {
        $locales = Locales::all();
        $prompt = json_encode([
            'task' => 'Translate catalog taxonomy (brand or category) for an industrial electronics storefront. Keep brand proper nouns recognizable; localize descriptive SEO text naturally (not word-for-word). Return JSON only.',
            'source_locale' => $sourceLocale,
            'target_locales' => $locales,
            'name' => $sourceName,
            'description' => $sourceDescription,
            'seo_title' => $sourceSeoTitle,
            'seo_description' => $sourceSeoDescription,
            'seo_keywords' => $sourceSeoKeywords,
            'schema' => [
                'name' => array_fill_keys($locales, 'string'),
                'description' => array_fill_keys($locales, 'string'),
                'seo_title' => array_fill_keys($locales, 'string'),
                'seo_description' => array_fill_keys($locales, 'string'),
                'seo_keywords' => array_fill_keys($locales, 'string'),
            ],
        ], JSON_UNESCAPED_UNICODE);

        try {
            $decoded = match ($provider) {
                'gemini' => $this->geminiJson((string) $prompt),
                'groq' => $this->chatJson(
                    'https://api.groq.com/openai/v1/chat/completions',
                    $this->apiKey('groq'),
                    (string) config('services.ai.groq_model', 'llama-3.1-8b-instant'),
                    (string) $prompt,
                ),
                default => $this->chatJson(
                    'https://api.openai.com/v1/chat/completions',
                    $this->apiKey('openai'),
                    (string) config('services.ai.openai_model', 'gpt-4o-mini'),
                    (string) $prompt,
                ),
            };
        } catch (\Throwable $e) {
            Log::warning('ai.taxonomy_translate_failed', ['error' => $e->getMessage()]);

            return $this->translateTaxonomyDemo(
                $sourceLocale,
                $sourceName,
                $sourceDescription,
                $sourceSeoTitle,
                $sourceSeoDescription,
                $sourceSeoKeywords,
            );
        }

        return [
            'name' => Locales::normalize($decoded['name'] ?? []),
            'description' => Locales::normalize($decoded['description'] ?? []),
            'seo_title' => Locales::normalize($decoded['seo_title'] ?? []),
            'seo_description' => Locales::normalize($decoded['seo_description'] ?? []),
            'seo_keywords' => Locales::normalize($decoded['seo_keywords'] ?? []),
        ];
    }

    /** @return array<string, mixed> */
    private function draftDemo(string $description, string $sourceLocale): array
    {
        $title = Str::limit(preg_replace('/\s+/', ' ', $description) ?? $description, 80, '');
        $part = null;
        if (preg_match('/\b([A-Z0-9]{2,}[-\/][A-Z0-9][-\/A-Z0-9]+)\b/i', $description, $m)) {
            $part = strtoupper($m[1]);
        }

        $name = Locales::normalize([]);
        $summary = Locales::normalize([]);
        $notes = Locales::normalize([]);
        $name[$sourceLocale] = $title !== '' ? $title : 'Industrial component';
        $summary[$sourceLocale] = Str::limit($description, 280);
        $notes[$sourceLocale] = 'Draft generated in demo AI mode. Review before publish.';

        $label = Locales::normalize([]);
        $label[$sourceLocale] = 'Notes';

        return [
            'name' => $name,
            'summary' => $summary,
            'notes' => $notes,
            'part_number' => $part,
            'model' => null,
            'sku' => $part ? 'JALA-'.Str::upper(Str::substr(preg_replace('/[^A-Z0-9]/', '', $part) ?? 'X', 0, 8)) : null,
            'condition' => str_contains(strtolower($description), 'new') ? 'new' : 'used',
            'testing' => 'tested',
            'weight' => null,
            'dimensions' => null,
            'specs' => [
                ['label' => $label, 'value' => 'See description'],
            ],
        ];
    }

    /**
     * @param  list<array{label: array<string, string>, value: string}>  $specs
     * @return array{name: array<string, string>, summary: array<string, string>, notes: array<string, string>, specs: list<array{label: array<string, string>, value: string}>}
     */
    private function translateDemo(
        string $sourceLocale,
        string $sourceName,
        string $sourceSummary,
        string $sourceNotes,
        array $specs,
    ): array {
        $name = Locales::normalize([]);
        $summary = Locales::normalize([]);
        $notes = Locales::normalize([]);
        foreach (Locales::all() as $locale) {
            $prefix = $locale === $sourceLocale ? '' : '['.$locale.'] ';
            $name[$locale] = $prefix.$sourceName;
            $summary[$locale] = $prefix.$sourceSummary;
            $notes[$locale] = $prefix.$sourceNotes;
        }

        $outSpecs = [];
        foreach ($specs as $spec) {
            $label = Locales::normalize([]);
            $sourceLabel = Locales::pick($spec['label'], $sourceLocale);
            foreach (Locales::all() as $locale) {
                $prefix = $locale === $sourceLocale ? '' : '['.$locale.'] ';
                $label[$locale] = $prefix.$sourceLabel;
            }
            $outSpecs[] = ['label' => $label, 'value' => $spec['value']];
        }

        return compact('name', 'summary', 'notes') + ['specs' => $outSpecs];
    }

    /** @return array<string, mixed> */
    private function draftViaGroq(string $description, string $sourceLocale): array
    {
        return $this->draftViaChatCompletions(
            'https://api.groq.com/openai/v1/chat/completions',
            $this->apiKey('groq'),
            (string) config('services.ai.groq_model', 'llama-3.1-8b-instant'),
            $description,
            $sourceLocale,
        );
    }

    /** @return array<string, mixed> */
    private function draftViaOpenAi(string $description, string $sourceLocale): array
    {
        return $this->draftViaChatCompletions(
            'https://api.openai.com/v1/chat/completions',
            $this->apiKey('openai'),
            (string) config('services.ai.openai_model', 'gpt-4o-mini'),
            $description,
            $sourceLocale,
        );
    }

    /** @return array<string, mixed> */
    private function draftViaGemini(string $description, string $sourceLocale): array
    {
        $key = $this->apiKey('gemini');
        $model = (string) config('services.ai.gemini_model', 'gemini-2.0-flash');
        $prompt = $this->draftPrompt($description, $sourceLocale);
        $response = Http::timeout(60)
            ->withQueryParameters(['key' => $key])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'contents' => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.2, 'responseMimeType' => 'application/json'],
            ]);

        if (! $response->successful()) {
            Log::warning('ai.gemini_draft_failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw ValidationException::withMessages(['ai' => ['Gemini request failed. Check AI_GEMINI_KEY or use demo.']]);
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');

        return $this->decodeJsonObject((string) $text);
    }

    /** @return array<string, mixed> */
    private function draftViaChatCompletions(string $url, string $key, string $model, string $description, string $sourceLocale): array
    {
        $response = Http::timeout(60)
            ->withToken($key)
            ->acceptJson()
            ->post($url, [
                'model' => $model,
                'temperature' => 0.2,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => 'You extract structured product data for an industrial electronics marketplace. Reply with JSON only.'],
                    ['role' => 'user', 'content' => $this->draftPrompt($description, $sourceLocale)],
                ],
            ]);

        if (! $response->successful()) {
            Log::warning('ai.chat_draft_failed', ['url' => $url, 'status' => $response->status(), 'body' => $response->body()]);
            throw ValidationException::withMessages(['ai' => ['AI draft request failed. Check API key or use demo.']]);
        }

        $text = (string) data_get($response->json(), 'choices.0.message.content', '');

        return $this->decodeJsonObject($text);
    }

    /**
     * @param  list<array{label: array<string, string>, value: string}>  $specs
     * @return array{name: array<string, string>, summary: array<string, string>, notes: array<string, string>, specs: list<array{label: array<string, string>, value: string}>}
     */
    private function translateViaLlm(
        string $provider,
        string $sourceLocale,
        string $sourceName,
        string $sourceSummary,
        string $sourceNotes,
        array $specs,
    ): array {
        $locales = Locales::all();
        $specLabels = array_map(fn ($s) => Locales::pick($s['label'], $sourceLocale), $specs);
        $prompt = json_encode([
            'task' => 'Translate industrial product copy into all locales. Keep technical part numbers unchanged inside values. Return JSON.',
            'source_locale' => $sourceLocale,
            'target_locales' => $locales,
            'name' => $sourceName,
            'summary' => $sourceSummary,
            'notes' => $sourceNotes,
            'spec_labels' => $specLabels,
            'schema' => [
                'name' => array_fill_keys($locales, 'string'),
                'summary' => array_fill_keys($locales, 'string'),
                'notes' => array_fill_keys($locales, 'string'),
                'spec_labels' => [array_fill_keys($locales, 'string')],
            ],
        ], JSON_UNESCAPED_UNICODE);

        try {
            $decoded = match ($provider) {
                'gemini' => $this->geminiJson((string) $prompt),
                'groq' => $this->chatJson(
                    'https://api.groq.com/openai/v1/chat/completions',
                    $this->apiKey('groq'),
                    (string) config('services.ai.groq_model', 'llama-3.1-8b-instant'),
                    (string) $prompt,
                ),
                default => $this->chatJson(
                    'https://api.openai.com/v1/chat/completions',
                    $this->apiKey('openai'),
                    (string) config('services.ai.openai_model', 'gpt-4o-mini'),
                    (string) $prompt,
                ),
            };
        } catch (\Throwable $e) {
            Log::warning('ai.translate_failed', ['error' => $e->getMessage()]);

            return $this->translateDemo($sourceLocale, $sourceName, $sourceSummary, $sourceNotes, $specs);
        }

        $outSpecs = [];
        foreach ($specs as $index => $spec) {
            $labels = Locales::normalize(data_get($decoded, 'spec_labels.'.$index, $spec['label']));
            $outSpecs[] = ['label' => $labels, 'value' => $spec['value']];
        }

        return [
            'name' => Locales::normalize($decoded['name'] ?? []),
            'summary' => Locales::normalize($decoded['summary'] ?? []),
            'notes' => Locales::normalize($decoded['notes'] ?? []),
            'specs' => $outSpecs,
        ];
    }

    /** @return array<string, mixed> */
    private function geminiJson(string $prompt): array
    {
        $key = $this->apiKey('gemini');
        $model = (string) config('services.ai.gemini_model', 'gemini-2.0-flash');
        $response = Http::timeout(90)
            ->withQueryParameters(['key' => $key])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'contents' => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.2, 'responseMimeType' => 'application/json'],
            ]);
        if (! $response->successful()) {
            throw new \RuntimeException('gemini failed');
        }

        return $this->decodeJsonObject((string) data_get($response->json(), 'candidates.0.content.parts.0.text', ''));
    }

    /** @return array<string, mixed> */
    private function chatJson(string $url, string $key, string $model, string $prompt): array
    {
        $response = Http::timeout(90)
            ->withToken($key)
            ->acceptJson()
            ->post($url, [
                'model' => $model,
                'temperature' => 0.2,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => 'Translate marketplace product copy. Reply with JSON only.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);
        if (! $response->successful()) {
            throw new \RuntimeException('chat failed');
        }

        return $this->decodeJsonObject((string) data_get($response->json(), 'choices.0.message.content', ''));
    }

    private function draftPrompt(string $description, string $sourceLocale): string
    {
        $locales = Locales::all();

        return <<<PROMPT
Extract a product draft for an industrial electronics store from this description.
Write textual fields ONLY in locale "{$sourceLocale}". Leave other locale keys as empty strings.
Return JSON with keys:
name (object with locales: {$this->localeList()}),
summary (same),
notes (same),
part_number (string|null),
model (string|null),
sku (string|null),
condition (one of: new, used, refurbished, parts),
testing (one of: tested, working, untested, defective, partial, unknown),
weight (string|null),
dimensions (string|null),
specs (array of {label: locale-object, value: string})

Description:
{$description}
PROMPT;
    }

    private function localeList(): string
    {
        return implode(', ', Locales::all());
    }

    /** @param  array<string, mixed>  $draft */
    private function normalizeDraft(array $draft, string $sourceLocale): array
    {
        $name = Locales::normalize($draft['name'] ?? []);
        $summary = Locales::normalize($draft['summary'] ?? []);
        $notes = Locales::normalize($draft['notes'] ?? []);
        if (! Locales::filled($name)) {
            $name[$sourceLocale] = 'Product draft';
        }

        $specs = [];
        foreach ($draft['specs'] ?? [] as $spec) {
            if (! is_array($spec) || blank($spec['value'] ?? null)) {
                continue;
            }
            $specs[] = [
                'label' => Locales::normalize($spec['label'] ?? []),
                'value' => (string) $spec['value'],
            ];
        }

        $condition = (string) ($draft['condition'] ?? 'used');
        if (! in_array($condition, ['new', 'used', 'refurbished', 'parts'], true)) {
            $condition = 'used';
        }
        $testing = (string) ($draft['testing'] ?? 'tested');
        if (! in_array($testing, ['tested', 'working', 'untested', 'defective', 'partial', 'unknown'], true)) {
            $testing = 'tested';
        }

        return [
            'source_locale' => $sourceLocale,
            'name' => $name,
            'summary' => $summary,
            'notes' => $notes,
            'part_number' => $draft['part_number'] ?? null,
            'model' => $draft['model'] ?? null,
            'sku' => $draft['sku'] ?? null,
            'condition' => $condition,
            'testing' => $testing,
            'weight' => $draft['weight'] ?? null,
            'dimensions' => $draft['dimensions'] ?? null,
            'specs' => $specs,
            'provider' => $this->provider(),
        ];
    }

    /** @return array<string, mixed> */
    private function decodeJsonObject(string $text): array
    {
        $text = trim($text);
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*/i', '', $text) ?? $text;
            $text = preg_replace('/\s*```$/', '', $text) ?? $text;
        }
        $decoded = json_decode($text, true);
        if (! is_array($decoded)) {
            throw ValidationException::withMessages(['ai' => ['AI returned invalid JSON.']]);
        }

        return $decoded;
    }

    private function apiKey(string $provider): string
    {
        return match ($provider) {
            'groq' => (string) config('services.ai.groq_key', ''),
            'gemini' => (string) config('services.ai.gemini_key', ''),
            'openai' => (string) config('services.ai.openai_key', ''),
            default => '',
        };
    }
}
