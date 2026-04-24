<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prenatal_top', function (Blueprint $t) {
            $t->id();

            // One row per patient
            $t->unsignedBigInteger('patient_id')->index();
            $t->unique('patient_id'); // enforce 1:1 (remove if you expect multiple pregnancies)

            // Pregnancy details (from form image)
            $t->date('lmp')->nullable();        // Last Menstrual Period
            $t->date('edc')->nullable();        // Expected Date of Confinement
            $t->string('ob_g', 16)->nullable(); // G
            $t->string('ob_p', 16)->nullable(); // P
            $t->string('ob_gtpal', 32)->nullable(); // G_T_P_A_L string

            // Risk code detection dates (A–E)
            $t->date('risk_a_date')->nullable(); // age <18 or >35
            $t->date('risk_b_date')->nullable(); // height <145 cm
            $t->date('risk_c_date')->nullable(); // 4th+ baby
            $t->date('risk_d_date')->nullable(); // prev CS / 3+ miscarriages / stillbirth / PPH
            $t->date('risk_e_date')->nullable(); // TB / Heart / DM / Asthma / Goiter

            // Tetanus toxoid & Vitamin A dates
            $t->date('tt1_date')->nullable();
            $t->date('tt2_date')->nullable();
            $t->date('tt3_date')->nullable();
            $t->date('tt4_date')->nullable();
            $t->date('tt5_date')->nullable();
            $t->date('vitamin_a_date')->nullable();

            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prenatal_top');
    }
};
