<?php

namespace App\Services;

use App\Events\InboxNotificationCreated;
use App\Models\InboxNotification;
use App\Models\NotificationTemplate;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotifyService
{
    /**
     * Customer / user template-based notification (inbox + optional mail).
     */
    public function send(User $user, string $type, array $vars = [], string $locale = 'en'): void
    {
        $template = NotificationTemplate::query()->where('key', $type)->first();
        if ($template && ! $template->enabled) {
            return;
        }

        $subject = $template?->subject[$locale] ?? $template?->subject['en'] ?? $type;
        $body = $template?->body[$locale] ?? $template?->body['en'] ?? $type;
        foreach ($vars as $key => $value) {
            $subject = str_replace('{'.$key.'}', (string) $value, $subject);
            $body = str_replace('{'.$key.'}', (string) $value, $body);
        }

        $this->push($user, $type, $subject, $body, $vars);

        try {
            Mail::raw($body, function ($message) use ($user, $subject) {
                $message->to($user->email, $user->name)->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::warning('notify.mail_failed', ['type' => $type, 'user' => $user->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Persist inbox row and broadcast realtime to the user (Reverb).
     */
    public function push(
        User $user,
        string $type,
        string $title,
        string $body,
        array $meta = [],
        ?string $href = null,
    ): InboxNotification {
        $notification = InboxNotification::query()->create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'meta' => $meta ?: null,
            'href' => $href,
        ]);

        try {
            event(new InboxNotificationCreated($notification));
        } catch (\Throwable $e) {
            Log::warning('notify.broadcast_failed', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $notification;
    }

    /**
     * Notify all staff who can see the admin desk (super_admin / ops / …).
     */
    public function notifyAdmins(
        string $type,
        string $title,
        string $body,
        array $meta = [],
        ?string $href = null,
    ): void {
        foreach ($this->adminRecipients() as $admin) {
            $this->push($admin, $type, $title, $body, $meta, $href);
        }
    }

    /**
     * @return Collection<int, User>
     */
    public function adminRecipients(): Collection
    {
        $byRole = User::query()
            ->role(['super_admin', 'ops', 'catalog', 'support'])
            ->where('is_active', true)
            ->get();

        if ($byRole->isNotEmpty()) {
            return $byRole;
        }

        return User::permission('admin.overview')->where('is_active', true)->get();
    }
}
