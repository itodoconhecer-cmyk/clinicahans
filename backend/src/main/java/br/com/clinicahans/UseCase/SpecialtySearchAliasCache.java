package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.DoctorRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** Loads the static, versioned database vocabulary once after migrations run. */
@Component
@Order(5)
public class SpecialtySearchAliasCache implements ApplicationRunner {
    private final DoctorRepository doctors;
    private volatile Vocabulary vocabulary = new Vocabulary(List.of(), Map.of());

    public SpecialtySearchAliasCache(DoctorRepository doctors) {
        this.doctors = doctors;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> specialties = doctors.listSpecialties().stream()
            .map(specialty -> specialty.name()).toList();
        Map<String, String> aliases = doctors.listSpecialtySearchAliases();
        vocabulary = new Vocabulary(specialties, aliases);
    }

    public Map<String, String> aliases() {
        return vocabulary.aliases();
    }

    public List<String> specialties() {
        return vocabulary.specialties();
    }

    private record Vocabulary(List<String> specialties, Map<String, String> aliases) {}
}
