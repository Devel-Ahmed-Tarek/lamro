<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'demo' => (bool) env('STRIPE_DEMO', true),
        'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:3000'),
    ],

    'sentry' => [
        'dsn' => env('SENTRY_DSN'),
    ],

    /*
    | AI for product draft + translation.
    | provider: demo|groq|gemini|openai
    | Free-tier friendly defaults: groq (https://console.groq.com) or gemini (Google AI Studio).
    | Without a key, "demo" always works for development.
    */
    'ai' => [
        'provider' => env('AI_PROVIDER', 'demo'),
        'groq_key' => env('AI_GROQ_KEY', env('GROQ_API_KEY')),
        'groq_model' => env('AI_GROQ_MODEL', 'openai/gpt-oss-120b'),
        'gemini_key' => env('AI_GEMINI_KEY', env('GEMINI_API_KEY')),
        'gemini_model' => env('AI_GEMINI_MODEL', 'gemini-2.0-flash'),
        'openai_key' => env('AI_OPENAI_KEY', env('OPENAI_API_KEY')),
        'openai_model' => env('AI_OPENAI_MODEL', 'gpt-4o-mini'),
    ],

];
