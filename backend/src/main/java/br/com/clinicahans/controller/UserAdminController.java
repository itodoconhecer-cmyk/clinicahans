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
    private final UserAdminUseCase userAdminUseCase;
    public UserAdminController(UserAdminUseCase userAdminUseCase){this.userAdminUseCase=userAdminUseCase;}

    @GetMapping
    public List<UserAdminUseCase.UserView> list(){return userAdminUseCase.list();}

    @GetMapping("/roles")
    public List<String> roles(){return userAdminUseCase.availableRoles();}

    @PostMapping
    public UserAdminUseCase.UserView create(@Valid @RequestBody CreateUserRequest r){return userAdminUseCase.create(r.username(),r.password(),r.roles());}

    @PostMapping("/{id}/deactivate")
    public void deactivate(@PathVariable UUID id){userAdminUseCase.deactivate(id);}

    
}
