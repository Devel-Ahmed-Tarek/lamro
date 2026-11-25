<?php

use App\Models\CmsPage;
use App\Models\NotificationTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_verification_tokens')) {
            Schema::create('email_verification_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        NotificationTemplate::query()->updateOrCreate(
            ['key' => 'password_reset'],
            [
                'channel' => 'email',
                'enabled' => true,
                'subject' => [
                    'de' => 'Passwort zurücksetzen — Jala',
                    'en' => 'Reset your password — Jala',
                    'ar' => 'إعادة تعيين كلمة المرور — Jala',
                ],
                'body' => [
                    'de' => "Hallo {name},\n\nSie können Ihr Passwort hier zurücksetzen:\n{reset_url}\n\nFalls Sie das nicht angefordert haben, ignorieren Sie diese Nachricht.\n\n— Jala",
                    'en' => "Hello {name},\n\nReset your password here:\n{reset_url}\n\nIf you did not request this, ignore this message.\n\n— Jala",
                    'ar' => "مرحبًا {name}،\n\nأعد تعيين كلمة المرور من هنا:\n{reset_url}\n\nإذا لم تطلب ذلك فتجاهل الرسالة.\n\n— Jala",
                ],
            ],
        );

        NotificationTemplate::query()->updateOrCreate(
            ['key' => 'email_verify'],
            [
                'channel' => 'email',
                'enabled' => true,
                'subject' => [
                    'de' => 'E-Mail bestätigen — Jala',
                    'en' => 'Confirm your email — Jala',
                    'ar' => 'تأكيد البريد — Jala',
                ],
                'body' => [
                    'de' => "Hallo {name},\n\nBitte bestätigen Sie Ihre E-Mail:\n{verify_url}\n\n— Jala",
                    'en' => "Hello {name},\n\nPlease confirm your email:\n{verify_url}\n\n— Jala",
                    'ar' => "مرحبًا {name}،\n\nيرجى تأكيد بريدك:\n{verify_url}\n\n— Jala",
                ],
            ],
        );

        $pages = [
            'impressum' => [
                'de' => [
                    'title' => 'Impressum',
                    'body' => "Angaben gemäß § 5 TMG\n\nJala Industrieelektronik\nMusterstraße 12\n10115 Berlin\nDeutschland\n\nVertreten durch: die Geschäftsführung\n\nKontakt\nTelefon: +49 30 000000\nE-Mail: hello@jala.example\n\nUmsatzsteuer-ID: DE000000000\n\nVerantwortlich für den Inhalt nach § 55 Abs. 2 RStV: die Geschäftsführung (Anschrift wie oben).\n\nHaftungshinweis: Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.",
                ],
                'en' => [
                    'title' => 'Legal notice',
                    'body' => "Information according to German Telemedia Act (TMG)\n\nJala Industrial Electronics\nSample Street 12\n10115 Berlin\nGermany\n\nRepresented by the managing directors\n\nContact\nPhone: +49 30 000000\nEmail: hello@jala.example\n\nVAT ID: DE000000000\n\nResponsible for content: managing directors (address as above).\n\nDisclaimer: We are not responsible for the content of external links.",
                ],
            ],
            'privacy' => [
                'de' => [
                    'title' => 'Datenschutzerklärung',
                    'body' => "1. Verantwortlicher\nJala Industrieelektronik, Musterstraße 12, 10115 Berlin, hello@jala.example\n\n2. Zwecke der Verarbeitung\nWir verarbeiten personenbezogene Daten zur Bereitstellung des Shops und der Auktionen, zur Vertragsabwicklung, Zahlung, Versand und Support sowie — sofern eingewilligt — für Analyse und Marketing.\n\n3. Rechtsgrundlagen\nArt. 6 Abs. 1 lit. b DSGVO (Vertrag), lit. c (Rechtspflicht), lit. f (berechtigtes Interesse) sowie lit. a (Einwilligung) für optionale Cookies/Analytics.\n\n4. Speicherdauer\nDaten werden nur so lange gespeichert, wie es für die Zwecke erforderlich oder gesetzlich vorgeschrieben ist.\n\n5. Rechte der Betroffenen\nAuskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Beschwerde bei einer Aufsichtsbehörde ist möglich.\n\n6. Cookies\nNotwendige Cookies für Login/Warenkorb. Analyse-Cookies nur nach Einwilligung. Details unter Cookies.\n\n7. Kontakt Datenschutz\nhello@jala.example",
                ],
                'en' => [
                    'title' => 'Privacy policy',
                    'body' => "1. Controller\nJala Industrial Electronics, Sample Street 12, 10115 Berlin, hello@jala.example\n\n2. Purposes\nWe process personal data to run the store and auctions, fulfil contracts, payments, shipping and support, and — with consent — analytics/marketing.\n\n3. Legal bases\nGDPR Art. 6(1)(b) contract, (c) legal obligation, (f) legitimate interest, and (a) consent for optional cookies/analytics.\n\n4. Retention\nData is kept only as long as needed for those purposes or required by law.\n\n5. Your rights\nAccess, rectification, erasure, restriction, portability and objection. You may lodge a complaint with a supervisory authority.\n\n6. Cookies\nEssential cookies for login/cart. Analytics cookies only after consent. See Cookies.\n\n7. Contact\nhello@jala.example",
                ],
            ],
            'terms' => [
                'de' => [
                    'title' => 'Allgemeine Geschäftsbedingungen',
                    'body' => "1. Geltungsbereich\nDiese AGB gelten für Käufe und Auktionsteilnahmen über die Jala-Plattform gegenüber Unternehmern und Verbrauchern, soweit nicht zwingend anderes Recht entgegensteht.\n\n2. Vertragsschluss\nAngebote im Shop sind freibleibend. Der Vertrag kommt mit Auftragsbestätigung bzw. Zuschlag in der Auktion zustande.\n\n3. Preise und Zahlung\nPreise in EUR zzgl. gesetzlicher MwSt., soweit nicht anders ausgewiesen. Zahlung per den angebotenen Methoden.\n\n4. Lieferung\nVersand nach Verfügbarkeit. Gefahrübergang nach gesetzlichen Regeln.\n\n5. Zustand und Prüfung\nAngaben zu Zustand und Prüfstatus sind bestmöglich, ersetzen aber keine Eingangsprüfung beim Kunden.\n\n6. Widerruf / Retouren\nFür Verbraucher gelten gesetzliche Widerrufsrechte. Für Unternehmer gelten die vereinbarten Rückgaberegeln.\n\n7. Haftung\nHaftung nach den gesetzlichen Vorschriften; keine Haftung für leichte Fahrlässigkeit außer bei Kardinalpflichten, Leben, Körper, Gesundheit.\n\n8. Schlussbestimmungen\nEs gilt deutsches Recht unter Ausschluss des UN-Kaufrechts, soweit zulässig. Gerichtsstand für Kaufleute: Berlin.",
                ],
                'en' => [
                    'title' => 'Terms and conditions',
                    'body' => "1. Scope\nThese terms apply to purchases and auction participation on the Jala platform for businesses and consumers, unless mandatory law says otherwise.\n\n2. Contract formation\nStore listings are non-binding. A contract is formed on order confirmation or auction award.\n\n3. Prices and payment\nPrices in EUR plus VAT unless stated otherwise. Payment via the offered methods.\n\n4. Delivery\nShipping subject to availability. Risk passes under applicable law.\n\n5. Condition and testing\nCondition and testing status are stated in good faith and do not replace incoming inspection by the buyer.\n\n6. Withdrawal / returns\nConsumers keep statutory withdrawal rights. Business returns follow agreed rules.\n\n7. Liability\nLiability under statute; no liability for slight negligence except for essential duties or injury to life, body or health.\n\n8. Final provisions\nGerman law applies excluding CISG where permitted. Venue for merchants: Berlin.",
                ],
            ],
            'cookies' => [
                'de' => [
                    'title' => 'Cookie-Hinweis',
                    'body' => "Wir verwenden notwendige Cookies für Anmeldung, Warenkorb und Sicherheit.\n\nOptionale Analyse-Cookies (z. B. Reichweitenmessung) setzen wir nur, wenn Sie zustimmen. Sie können Ihre Wahl jederzeit über den Cookie-Banner ändern.\n\nOhne Einwilligung werden keine Analyse-Skripte geladen.",
                ],
                'en' => [
                    'title' => 'Cookie notice',
                    'body' => "We use essential cookies for login, cart and security.\n\nOptional analytics cookies are only set if you consent. You can change your choice anytime via the cookie banner.\n\nWithout consent, analytics scripts are not loaded.",
                ],
            ],
            'auction-terms' => [
                'de' => [
                    'title' => 'Auktionsbedingungen',
                    'body' => "1. Teilnahme\nZur Gebotsabgabe ist ein Konto und ggf. Freigabe erforderlich.\n\n2. Gebote\nGebote sind verbindlich. Soft-Close kann das Ende verlängern.\n\n3. Zuschlag\nMit Zuschlag entsteht ein Kaufvertrag zum Höchstgebot zuzüglich Steuern/Versand.\n\n4. Zahlung\nZahlung fristgerecht nach den angegebenen Methoden.\n\n5. Nichtzahlung\nBei Nichtzahlung kann Jala vom Vertrag zurücktreten und den Bieter sperren.\n\n6. Technik\nTechnische Störungen können auftreten; Jala bemüht sich um Wiederherstellung, ohne Garantie für ununterbrochenen Betrieb.",
                ],
                'en' => [
                    'title' => 'Auction terms',
                    'body' => "1. Participation\nBidding requires an account and may require approval.\n\n2. Bids\nBids are binding. Soft-close may extend the end time.\n\n3. Award\nAward creates a purchase contract at the winning bid plus tax/shipping.\n\n4. Payment\nPay on time via the stated methods.\n\n5. Non-payment\nJala may cancel and suspend the bidder.\n\n6. Technology\nOutages may occur; Jala will try to restore service without guaranteeing uninterrupted uptime.",
                ],
            ],
        ];

        foreach ($pages as $slug => $locales) {
            $title = [];
            $body = [];
            foreach ($locales as $locale => $copy) {
                $title[$locale] = $copy['title'];
                $body[$locale] = $copy['body'];
            }
            CmsPage::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $title,
                    'body' => $body,
                    'status' => 'published',
                ],
            );
        }
    }

    public function down(): void
    {
        NotificationTemplate::query()->whereIn('key', ['password_reset', 'email_verify'])->delete();
        Schema::dropIfExists('email_verification_tokens');
    }
};
