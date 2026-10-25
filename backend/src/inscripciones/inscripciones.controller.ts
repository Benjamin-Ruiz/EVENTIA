import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { InscripcionesService } from './inscripciones.service';
import { CrearInscripcionDto } from './dto/crear-inscripcion.dto';
import { InscripcionRespuestaDto, ParticipanteDto } from './dto/inscripcion-respuesta.dto';

@ApiTags('Inscripciones')
@ApiBearerAuth()
@Controller('eventos/:eventoId/inscripciones')
export class EventoInscripcionesController {
  constructor(private readonly inscripciones: InscripcionesService) {}

  @Roles(Rol.USUARIO, Rol.ORGANIZADOR)
  @Post()
  @ApiOperation({ summary: 'Inscribirse en un evento. Descuenta el cupo de forma atómica.' })
  @ApiCreatedResponse({ type: InscripcionRespuestaDto })
  @ApiBadRequestResponse({ description: 'Cantidad inválida (≤ 0, no entera o mayor al máximo por solicitud)' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Rol no permitido o inscripción en un evento propio' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Sin cupos suficientes o evento cerrado' })
  @ApiUnprocessableEntityResponse({ description: 'Excede el máximo de plazas por usuario' })
  async inscribir(
    @Param('eventoId', ParseIntPipe) eventoId: number,
    @Body() dto: CrearInscripcionDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return InscripcionRespuestaDto.from(await this.inscripciones.inscribir(eventoId, dto, user));
  }

  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Get()
  @ApiOperation({ summary: 'Participantes de un evento propio (organizador) o de cualquiera (administrador)' })
  @ApiOkResponse({ type: [ParticipanteDto] })
  @ApiForbiddenResponse({ description: 'El evento pertenece a otro organizador' })
  async participantes(@Param('eventoId', ParseIntPipe) eventoId: number, @CurrentUser() user: UsuarioAutenticado) {
    return (await this.inscripciones.participantes(eventoId, user)).map(ParticipanteDto.from);
  }
}

@ApiTags('Inscripciones')
@ApiBearerAuth()
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripciones: InscripcionesService) {}

  @Get('mias')
  @ApiOperation({ summary: 'Inscripciones del usuario autenticado' })
  @ApiOkResponse({ type: [InscripcionRespuestaDto] })
  @ApiUnauthorizedResponse()
  async mias(@CurrentUser() user: UsuarioAutenticado) {
    return (await this.inscripciones.misInscripciones(user)).map(InscripcionRespuestaDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una inscripción (dueño, organizador del evento o administrador)' })
  @ApiOkResponse({ type: InscripcionRespuestaDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'La inscripción pertenece a otro usuario' })
  @ApiNotFoundResponse()
  async consultar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UsuarioAutenticado) {
    return InscripcionRespuestaDto.from(await this.inscripciones.consultar(id, user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar una inscripción propia y liberar los cupos' })
  @ApiOkResponse({ type: InscripcionRespuestaDto })
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  async cancelar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UsuarioAutenticado) {
    return InscripcionRespuestaDto.from(await this.inscripciones.cancelar(id, user));
  }
}
