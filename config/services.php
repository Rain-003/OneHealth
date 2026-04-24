<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ✅ PhilSMS configuration
    'philsms' => [
        'base_url'  => env('PHILSMS_BASE_URL', 'https://dashboard.philsms.com/api/v3'),
        'token'     => env('PHILSMS_API_TOKEN'),   // 👈 MUST match .env name
        'sender_id' => env('PHILSMS_SENDER_ID', 'OneHealth'),
        'type'      => env('PHILSMS_TYPE', 'plain'),
    ],

];
