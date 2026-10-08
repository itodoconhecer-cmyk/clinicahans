package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.PublicOperationView;
import br.com.clinicahans.UseCase.PublicOperationQueryUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/operations")
public class PublicOperationController {
    private final PublicOperationQueryUseCase queryUseCase;

    public PublicOperationController(PublicOperationQueryUseCase queryUseCase) {
        this.queryUseCase = queryUseCase;
    }

    @GetMapping
    public List<PublicOperationView> recent(@RequestParam(defaultValue = "50") int limit) {
        return queryUseCase.recent(limit);
    }
}
