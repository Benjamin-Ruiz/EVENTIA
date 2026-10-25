import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { EventosService } from './eventos.service';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';
import { BuscarEventosDto } from './dto/buscar-eventos.dto';
import { EventoRespuestaDto } from './dto/evento-respuesta.dto';

@ApiTags('Eventos')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Consultar y buscar eventos públicos (visitantes incluidos)' })
  async buscar(@Query() filtros: BuscarEventosDto) {
    const r = await this.eventos.buscar(filtros);
    return { ...r, items: r.items.map(EventoRespuestaDto.from) };
  }

  @ApiBearerAuth()
  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Get('mios')
  @ApiOperation({ summary: 'Eventos del organizador autenticado' })
  @ApiOkResponse({ type: [EventoRespuestaDto] })
  async mios(@CurrentUser() user: UsuarioAutenticado) {
    return (await this.eventos.misEventos(user)).map(EventoRespuestaDto.from);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un evento con su disponibilidad' })
  @ApiOkResponse({ type: EventoRespuestaDto })
  @ApiNotFoundResponse()
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return EventoRespuestaDto.from(await this.eventos.obtener(id));
  }

  @ApiBearerAuth()
  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Post()
  @ApiOperation({ summary: 'Crear evento (organizador autenticado)' })
  @ApiCreatedResponse({ type: EventoRespuestaDto, description: 'Evento creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos (cupo/precio negativos, título vacío, propiedades no permitidas)' })
  @ApiUnauthorizedResponse({ description: 'Autenticación ausente o inválida' })
  @ApiForbiddenResponse({ description: 'Usuario sin rol de organizador' })
  async crear(@Body() dto: CrearEventoDto, @CurrentUser() user: UsuarioAutenticado) {
    return EventoRespuestaDto.from(await this.eventos.crear(dto, user));
  }

  @ApiBearerAuth()
  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Put(':id')
  @ApiOperation({ summary: 'Modificar un evento propio (el administrador puede modificar cualquiera)' })
  @ApiOkResponse({ type: EventoRespuestaDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'El evento pertenece a otro organizador' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'El evento está cerrado' })
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEventoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return EventoRespuestaDto.from(await this.eventos.actualizar(id, dto, user));
  }

  @ApiBearerAuth()
  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar un evento propio: deja de admitir inscripciones y cambios' })
  @ApiOkResponse({ type: EventoRespuestaDto })
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  async cerrar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UsuarioAutenticado) {
    return EventoRespuestaDto.from(await this.eventos.cerrar(id, user));
  }

  @ApiBearerAuth()
  @Roles(Rol.ORGANIZADOR, Rol.ADMINISTRADOR)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un evento propio sin inscripciones' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UsuarioAutenticado) {
    await this.eventos.eliminar(id, user);
  }
}
