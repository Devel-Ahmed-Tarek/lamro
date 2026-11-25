<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendUserMailJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public string $email,
        public string $name,
        public string $subject,
        public string $body,
    ) {}

    public function handle(): void
    {
        Mail::raw($this->body, function ($message) {
            $message->to($this->email, $this->name)->subject($this->subject);
        });
    }

    public function failed(\Throwable $e): void
    {
        Log::error('notify.mail_job_failed', [
            'email' => $this->email,
            'subject' => $this->subject,
            'error' => $e->getMessage(),
        ]);
    }
}
