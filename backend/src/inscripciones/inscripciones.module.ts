import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventosModule } from '../eventos/eventos.module';
import { Inscripcion } from './entities/inscripcion.entity';
import { InscripcionesService } from './inscripciones.service';
import { EventoInscripcionesController, InscripcionesController } from './inscripciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion]), EventosModule],
  controllers: [EventoInscripcionesController, InscripcionesController],
  providers: [InscripcionesService],
})
export class InscripcionesModule {}
