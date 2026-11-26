<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_settings')) {
            return;
        }

        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 20)->default('demo');
            $table->text('groq_key')->nullable();
            $table->string('groq_model')->nullable();
            $table->text('gemini_key')->nullable();
            $table->string('gemini_model')->nullable();
            $table->text('openai_key')->nullable();
            $table->string('openai_model')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
