<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();

            // who did the action (health worker)
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // which patient is involved (nullable for global actions)
            $table->foreignId('patient_id')->nullable()
                  ->constrained('patients')->nullOnDelete();

            // short machine key and human text
            $table->string('type', 100);
            $table->string('description');

            // extra payload (what was changed, dose label, etc.)
            $table->json('properties')->nullable();

            // useful for audits
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
