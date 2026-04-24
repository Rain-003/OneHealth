<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {

        $email = 'admin@onehealth.com';

        $user = User::firstOrCreate(
            ['email' => Str::lower($email)],
            [
                'name'              => 'OneHealth Admin',
                'password'          => Hash::make('Onehealth@RHUadmin123'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );

        if ($user->role !== 'admin') {
            $user->role = 'admin';
            $user->save();
        }

        $barangays = [
            'Acacia',
            'Anahaw I',
            'Anahaw II',
            'Banaba',
            'Bulihan',
            'Ipil I',
            'Ipil II',
            'Narra I',
            'Narra II',
            'Narra III',
            'Yakal',
        ];

        foreach ($barangays as $barangay) {

            $slug = Str::of($barangay)
                ->lower()
                ->replace(['/', '\\'], ' ')
                ->replace('  ', ' ')
                ->trim();

            // Handle roman numerals at the end
            if ($slug->endsWith(' iii')) {
                $slug = $slug->replaceLast(' iii', '3');
            } elseif ($slug->endsWith(' ii')) {
                $slug = $slug->replaceLast(' ii', '2');
            } elseif ($slug->endsWith(' i')) {
                $slug = $slug->replaceLast(' i', '1');
            }

            // Replace remaining spaces with underscores
            $slug = $slug->replace(' ', '_')->toString();

            $hwEmail = Str::lower("bayani.{$slug}@onehealth.com");

            User::firstOrCreate(
                ['email' => $hwEmail],
                [
                    'name'              => "Bayani – {$barangay} HW",
                    'password'          => Hash::make('password'),
                    'role'              => 'health_worker',
                    'barangay'          => $barangay,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
