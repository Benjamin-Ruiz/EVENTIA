import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Rol } from '../common/enums/rol.enum';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Evento } from '../eventos/entities/evento.entity';
import { BCRYPT_ROUNDS } from '../usuarios/usuarios.service';

/** Carga datos de demostración la primera vez que arranca la aplicación (base de datos vacía). */
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seeder');

  constructor(private readonly dataSource: DataSource, private readonly config: ConfigService) {}

  async onApplicationBootstrap() {
    const usuarios = this.dataSource.getRepository(Usuario);
    if ((await usuarios.count()) > 0) return;

    const demo = this.config.get<string>('SEED_DEMO_PASSWORD');
    const admin = this.config.get<string>('SEED_ADMIN_PASSWORD');
    if (!demo || !admin) {
      this.logger.warn('SEED_ADMIN_PASSWORD / SEED_DEMO_PASSWORD no definidos: no se cargan datos de prueba');
      return;
    }
    const hashDemo = await bcrypt.hash(demo, BCRYPT_ROUNDS);

    const [, org1, org2] = await usuarios.save([
      usuarios.create({
        nombre: 'Administrador Eventia',
        correo: this.config.get('SEED_ADMIN_EMAIL', 'admin@eventia.test'),
        passwordHash: await bcrypt.hash(admin, BCRYPT_ROUNDS),
        rol: Rol.ADMINISTRADOR,
      }),
      usuarios.create({ nombre: 'Laura Organizadora', correo: 'laura@eventia.test', passwordHash: hashDemo, rol: Rol.ORGANIZADOR }),
      usuarios.create({ nombre: 'Pedro Organizador', correo: 'pedro@eventia.test', passwordHash: hashDemo, rol: Rol.ORGANIZADOR }),
      usuarios.create({ nombre: 'Carlos Usuario', correo: 'carlos@eventia.test', telefono: '55555555', passwordHash: hashDemo, rol: Rol.USUARIO }),
      usuarios.create({ nombre: 'María Usuaria', correo: 'maria@eventia.test', passwordHash: hashDemo, rol: Rol.USUARIO }),
    ]);

    const enDias = (d: number) => new Date(Date.now() + d * 86_400_000);
    await this.dataSource.getRepository(Evento).save([
      { titulo: 'Concierto universitario', descripcion: 'Bandas estudiantiles en vivo.', lugar: 'Auditorio URL Quetzaltenango', fecha: enDias(20), cupo: 150, precio: 75, organizadorId: org1.id },
      { titulo: 'Taller de NestJS', descripcion: 'Construye APIs seguras con Guards y DTOs.', lugar: 'Laboratorio 3', fecha: enDias(10), cupo: 3, precio: 0, organizadorId: org1.id },
      { titulo: 'Feria gastronómica', descripcion: 'Sabores de Xela.', lugar: 'Parque Central', fecha: enDias(30), cupo: 500, precio: 25, organizadorId: org2.id },
      { titulo: 'Hackathon Eventia', descripcion: '24 horas de innovación.', lugar: 'Centro de Innovación', fecha: enDias(45), cupo: 60, precio: 50, organizadorId: org2.id },
    ]);
    this.logger.log('Datos de demostración cargados');
  }
}
