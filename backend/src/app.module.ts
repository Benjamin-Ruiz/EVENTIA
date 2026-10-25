import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EventosModule } from './eventos/eventos.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { EventiaThrottlerGuard } from './common/guards/throttler.guard';
import { SeederService } from './database/seeder.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqljs',
        location: config.get('DB_FILE', 'data/eventia.sqlite'),
        autoSave: true,
        autoLoadEntities: true,
        synchronize: true,
        logging: false,
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      exclude: ['/api/(.*)', '/docs(.*)'],
    }),
    AuthModule,
    UsuariosModule,
    EventosModule,
    InscripcionesModule,
    NotificacionesModule,
  ],
  providers: [
    SeederService,
    // Orden: límite de solicitudes → autenticación (JWT) → autorización por rol (RBAC).
    { provide: APP_GUARD, useClass: EventiaThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
