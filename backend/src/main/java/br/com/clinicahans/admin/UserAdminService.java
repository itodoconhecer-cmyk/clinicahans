package br.com.clinicahans.admin;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserAdminService {
    private final JdbcTemplate jdbc; private final PasswordEncoder encoder; private final AuditService audit;
    public UserAdminService(JdbcTemplate jdbc,PasswordEncoder encoder,AuditService audit){this.jdbc=jdbc;this.encoder=encoder;this.audit=audit;}

    @Transactional
    public UserView create(String username,String password,List<String> roles){
        if(roles==null||roles.isEmpty()) throw new BusinessRuleException("Usuário deve possuir ao menos um perfil.");
        Integer existing=jdbc.queryForObject("select count(*) from app_user where username=?",Integer.class,username);
        if(existing!=null&&existing>0) throw new BusinessRuleException("Nome de usuário já existe.");
        UUID id=UUID.randomUUID();
        jdbc.update("insert into app_user(id,username,password_hash,active) values (?,?,?,true)",id,username,encoder.encode(password));
        for(String role:roles){
            int inserted=jdbc.update("""
              insert into user_role(user_id,role_id)
              select ?,id from role where code=?
              """,id,role);
            if(inserted==0) throw new BusinessRuleException("Perfil inválido: "+role);
        }
        audit.record("USER_CREATED","USER",id);
        return new UserView(id,username,true,roles);
    }

    public List<UserView> list(){
        return jdbc.query("""
          select u.id,u.username,u.active,
                 coalesce(string_agg(r.code, ',' order by r.code),'') roles
          from app_user u
          left join user_role ur on ur.user_id=u.id
          left join role r on r.id=ur.role_id
          group by u.id,u.username,u.active
          order by u.username
          """,(rs,n)->new UserView(
            rs.getObject("id",UUID.class),
            rs.getString("username"),
            rs.getBoolean("active"),
            rs.getString("roles").isBlank()?List.of():List.of(rs.getString("roles").split(","))
          ));
    }

    public void deactivate(UUID id){
        int changed=jdbc.update("update app_user set active=false where id=?",id);
        if(changed==0) throw new BusinessRuleException("Usuário não encontrado.");
        audit.record("USER_DEACTIVATED","USER",id);
    }

    public record UserView(UUID id,String username,boolean active,List<String> roles){}
}
