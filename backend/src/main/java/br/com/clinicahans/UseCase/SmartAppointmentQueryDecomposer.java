package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.AppointmentSearchCriteria;
import br.com.clinicahans.model.workforce.MedicalSpecialtyCatalog;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Decomposes free text by recognizing independent semantic dimensions rather
 * than enumerating complete sentence templates. Unknown words remain available
 * as a doctor/name term for the repository's parameterized text search.
 */
@Component
public class SmartAppointmentQueryDecomposer {
    private static final Pattern DATE = Pattern.compile("\\b([0-3]?\\d/[01]?\\d/\\d{4}|\\d{4}-\\d{2}-\\d{2})\\b");
    private static final Pattern TIME = Pattern.compile("\\b([01]?\\d|2[0-3])(?::([0-5]\\d)|h(?:([0-5]\\d)?)?)(?!\\d)");
    private static final List<String> STOP_WORDS = List.of(
        "dr", "dra", "doutor", "doutora", "medico", "medica", "consulta", "consultar",
        "para", "por", "de", "do", "da", "dos", "das", "na", "no", "nas", "nos",
        "a", "ao", "aos", "as", "os", "pela", "pelo", "pelas", "pelos", "em", "com", "e"
    );
    private static final List<Alias<Integer>> WEEKDAY_ALIASES = buildWeekdayAliases();
    private static final List<Alias<String>> PERIOD_ALIASES = buildPeriodAliases();

    public Decomposition decompose(String rawQuery, Collection<String> knownSpecialties) {
        return decompose(rawQuery, knownSpecialties, Map.of());
    }

    public Decomposition decompose(String rawQuery, Collection<String> knownSpecialties,
            Map<String, String> searchAliases) {
        String text = normalize(rawQuery).replaceAll("[^a-z0-9:/\\-\\s]", " ").replaceAll("\\s+", " ").trim();
        ExtractedDate extractedDate = extractDate(text);
        text = extractedDate.remaining();
        ExtractedTime extractedTime = extractTime(text);
        text = extractedTime.remaining();

        List<Alias<String>> specialtyAliases = buildSpecialtyAliases(knownSpecialties, searchAliases);
        List<String> tokens = tokenize(text);
        List<String> residual = new ArrayList<>();
        Integer weekday = null;
        String period = null;
        String specialty = null;

        for (int index = 0; index < tokens.size();) {
            Match<String> periodMatch = matchAt(tokens, index, PERIOD_ALIASES, true);
            if (periodMatch != null) {
                if (period == null) period = periodMatch.value();
                index += periodMatch.tokenCount();
                continue;
            }

            Match<Integer> weekdayMatch = matchAt(tokens, index, WEEKDAY_ALIASES, true);
            if (weekdayMatch != null) {
                if (weekday == null) weekday = weekdayMatch.value();
                index += weekdayMatch.tokenCount();
                continue;
            }

            Match<String> specialtyMatch = matchAt(tokens, index, specialtyAliases, true);
            if (specialtyMatch != null) {
                if (specialty == null) specialty = specialtyMatch.value();
                index += specialtyMatch.tokenCount();
                continue;
            }

            String token = tokens.get(index++);
            if (!STOP_WORDS.contains(token)) residual.add(token);
        }

        String doctorOrTerm = residual.isEmpty() ? null : String.join(" ", residual);
        AppointmentSearchCriteria criteria = new AppointmentSearchCriteria(
            doctorOrTerm, specialty, weekday, period, extractedDate.value(), extractedTime.value());
        String generalTerm = specialty == null ? doctorOrTerm : null;
        return new Decomposition(criteria, generalTerm);
    }

    private static ExtractedDate extractDate(String text) {
        Matcher matcher = DATE.matcher(text);
        if (!matcher.find()) return new ExtractedDate(null, text);
        String value = matcher.group(1);
        try {
            LocalDate date = value.contains("/")
                ? LocalDate.parse(value, DateTimeFormatter.ofPattern("d/M/uuuu"))
                : LocalDate.parse(value);
            return new ExtractedDate(date, removeSpan(text, matcher.start(), matcher.end()));
        } catch (DateTimeParseException exception) {
            throw new BusinessRuleException("A data informada na pesquisa é inválida.");
        }
    }

    private static ExtractedTime extractTime(String text) {
        Matcher matcher = TIME.matcher(text);
        if (!matcher.find()) return new ExtractedTime(null, text);
        int hour = Integer.parseInt(matcher.group(1));
        String minuteText = matcher.group(2) != null ? matcher.group(2) : matcher.group(3);
        LocalTime time = LocalTime.of(hour, minuteText == null || minuteText.isBlank() ? 0 : Integer.parseInt(minuteText));
        return new ExtractedTime(time, removeSpan(text, matcher.start(), matcher.end()));
    }

    private static String removeSpan(String text, int start, int end) {
        return (text.substring(0, start) + " " + text.substring(end)).replaceAll("\\s+", " ").trim();
    }

    private static List<Alias<Integer>> buildWeekdayAliases() {
        String[] days = {"segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"};
        List<Alias<Integer>> aliases = new ArrayList<>();
        for (int i = 0; i < days.length; i++) {
            String day = days[i];
            int weekday = i + 1;
            addAlias(aliases, day, weekday, true);
            addAlias(aliases, day + "s", weekday, true);
            if (weekday <= 5) {
                addAlias(aliases, day + " feira", weekday, false);
                addAlias(aliases, day + "s feira", weekday, false);
                addAlias(aliases, day + " feiras", weekday, false);
                addAlias(aliases, day + "s feiras", weekday, false);
            }
        }
        return ordered(aliases);
    }

    private static List<Alias<String>> buildPeriodAliases() {
        List<Alias<String>> aliases = new ArrayList<>();
        for (String term : List.of("manha", "manhas", "matutino", "matutina", "matutinos", "matutinas"))
            addAlias(aliases, term, "MANHÃ", true);
        for (String term : List.of("tarde", "tardes", "vespertino", "vespertina", "vespertinos", "vespertinas"))
            addAlias(aliases, term, "TARDE", true);
        for (String term : List.of("noite", "noites", "noturno", "noturna", "noturnos", "noturnas"))
            addAlias(aliases, term, "NOITE", true);
        return ordered(aliases);
    }

    private static List<Alias<String>> buildSpecialtyAliases(Collection<String> knownSpecialties,
            Map<String, String> searchAliases) {
        Map<String, String> canonicalByAlias = new LinkedHashMap<>();
        if (searchAliases != null) searchAliases.forEach(
            (alias, canonical) -> canonicalByAlias.put(normalize(alias), normalize(canonical)));
        MedicalSpecialtyCatalog.recognizedSpecialties().forEach(
            canonical -> canonicalByAlias.putIfAbsent(normalize(canonical), normalize(canonical)));
        if (knownSpecialties != null) {
            for (String specialty : knownSpecialties) {
                if (specialty != null && !specialty.isBlank()) {
                    String canonical = normalize(specialty);
                    canonicalByAlias.putIfAbsent(canonical, canonical);
                }
            }
        }
        List<Alias<String>> aliases = new ArrayList<>();
        canonicalByAlias.forEach((alias, canonical) -> addAlias(aliases, alias, canonical, true));
        return ordered(aliases);
    }

    private static <T> void addAlias(List<Alias<T>> aliases, String phrase, T value, boolean allowTypo) {
        aliases.add(new Alias<>(tokenize(normalize(phrase)), value, allowTypo));
    }

    private static <T> List<Alias<T>> ordered(List<Alias<T>> aliases) {
        aliases.sort(Comparator.<Alias<T>>comparingInt(alias -> alias.tokens().size()).reversed()
            .thenComparing(Comparator.comparingInt((Alias<T> alias) -> alias.tokens().stream()
                .mapToInt(String::length).sum()).reversed()));
        return List.copyOf(aliases);
    }

    private static <T> Match<T> matchAt(List<String> tokens, int index, List<Alias<T>> aliases, boolean allowTypo) {
        for (Alias<T> alias : aliases) {
            if (matchesExactly(tokens, index, alias.tokens()))
                return new Match<>(alias.value(), alias.tokens().size());
        }

        if (!allowTypo) return null;
        for (Alias<T> alias : aliases) {
            if (alias.allowTypo() && alias.tokens().size() == 1 && index < tokens.size()) {
                String candidate = tokens.get(index);
                String knownTerm = alias.tokens().get(0);
                if (knownTerm.length() >= 5 && differsByAtMostOneCharacter(candidate, knownTerm))
                    return new Match<>(alias.value(), 1);
            }
        }
        return null;
    }

    private static boolean matchesExactly(List<String> tokens, int index, List<String> phrase) {
        if (index + phrase.size() > tokens.size()) return false;
        for (int offset = 0; offset < phrase.size(); offset++) {
            if (!tokens.get(index + offset).equals(phrase.get(offset))) return false;
        }
        return true;
    }

    private static boolean differsByAtMostOneCharacter(String left, String right) {
        if (left.equals(right)) return true;
        if (Math.abs(left.length() - right.length()) > 1 || Math.min(left.length(), right.length()) < 5) return false;
        int leftIndex = 0;
        int rightIndex = 0;
        int differences = 0;
        while (leftIndex < left.length() && rightIndex < right.length()) {
            if (left.charAt(leftIndex) == right.charAt(rightIndex)) {
                leftIndex++;
                rightIndex++;
                continue;
            }
            if (++differences > 1) return false;
            if (left.length() > right.length()) leftIndex++;
            else if (right.length() > left.length()) rightIndex++;
            else {
                leftIndex++;
                rightIndex++;
            }
        }
        if (leftIndex < left.length() || rightIndex < right.length()) differences++;
        return differences <= 1;
    }

    private static List<String> tokenize(String text) {
        if (text == null || text.isBlank()) return List.of();
        return List.of(text.trim().split("[^a-z0-9]+"));
    }

    private static String normalize(String text) {
        if (text == null) return "";
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT).trim();
    }

    public record Decomposition(AppointmentSearchCriteria criteria, String generalTerm) {}
    private record Alias<T>(List<String> tokens, T value, boolean allowTypo) {}
    private record Match<T>(T value, int tokenCount) {}
    private record ExtractedDate(LocalDate value, String remaining) {}
    private record ExtractedTime(LocalTime value, String remaining) {}
}
