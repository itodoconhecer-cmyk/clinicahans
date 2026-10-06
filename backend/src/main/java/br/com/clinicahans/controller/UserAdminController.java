package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.UserAdminUseCase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {
    private final UserAdminUseCase service;
    public UserAdminController(UserAdminUseCase service){this.service=service;}

    @GetMapping
    public List<UserAdminUseCase.UserView> list(){return service.list();}

    @PostMapping
    public UserAdminUseCase.UserView create(@Valid @RequestBody CreateUserRequest r){return service.create(r.username(),r.password(),r.roles());}

    @PostMapping("/{id}/deactivate")
    public void deactivate(@PathVariable UUID id){service.deactivate(id);}

    
}
