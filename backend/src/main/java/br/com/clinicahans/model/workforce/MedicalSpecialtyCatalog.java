package br.com.clinicahans.model.workforce;

import java.util.List;

/**
 * Recognized Brazilian medical specialties. Canonical names follow Portaria
 * CME 01/2024, approved by CFM Resolution 2.380/2024. Areas of practice are
 * intentionally not listed as specialties.
 */
public final class MedicalSpecialtyCatalog {
    private static final List<String> RECOGNIZED_SPECIALTIES = List.of(
        "Acupuntura", "Alergia e imunologia", "Anestesiologia", "Angiologia", "Cardiologia",
        "Cirurgia cardiovascular", "Cirurgia da mão", "Cirurgia de cabeça e pescoço",
        "Cirurgia do aparelho digestivo", "Cirurgia geral", "Cirurgia oncológica",
        "Cirurgia pediátrica", "Cirurgia plástica", "Cirurgia torácica", "Cirurgia vascular",
        "Clínica médica", "Coloproctologia", "Dermatologia", "Endocrinologia e metabologia",
        "Endoscopia", "Gastroenterologia", "Genética médica", "Geriatria",
        "Ginecologia e obstetrícia", "Hematologia e hemoterapia", "Homeopatia", "Infectologia",
        "Mastologia", "Medicina de emergência", "Medicina de família e comunidade",
        "Medicina do trabalho", "Medicina do tráfego", "Medicina esportiva",
        "Medicina física e reabilitação", "Medicina intensiva", "Medicina legal e perícia médica",
        "Medicina nuclear", "Medicina preventiva e social", "Nefrologia", "Neurocirurgia",
        "Neurologia", "Nutrologia", "Oftalmologia", "Oncologia clínica",
        "Ortopedia e traumatologia", "Otorrinolaringologia", "Patologia",
        "Patologia clínica/medicina laboratorial", "Pediatria", "Pneumologia", "Psiquiatria",
        "Radiologia e diagnóstico por imagem", "Radioterapia", "Reumatologia", "Urologia"
    );

    private MedicalSpecialtyCatalog() {}

    public static List<String> recognizedSpecialties() {
        return RECOGNIZED_SPECIALTIES;
    }
}
