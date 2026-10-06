package br.com.clinicahans.admin;

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
    private final UserAdminService service;
    public UserAdminController(UserAdminService service){this.service=service;}

    @GetMapping
    public List<UserAdminService.UserView> list(){return service.list();}

    @PostMapping
    public UserAdminService.UserView create(@Valid @RequestBody CreateUserRequest r){return service.create(r.username(),r.password(),r.roles());}

    @PostMapping("/{id}/deactivate")
    public void deactivate(@PathVariable UUID id){service.deactivate(id);}

    public record CreateUserRequest(@NotBlank @Size(max=120) String username,@NotBlank @Size(min=12,max=200) String password,List<String> roles){}
}
