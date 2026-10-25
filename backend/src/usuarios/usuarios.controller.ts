import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { Rol } from '../common/enums/rol.enum';
import { UsuariosService } from './usuarios.service';
import { RegistroDto } from './dto/registro.dto';
import { UsuarioAdminDto, UsuarioPublicoDto } from './dto/usuario-publico.dto';
import { ActualizarUsuarioAdminDto } from './dto/actualizar-usuario-admin.dto';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Registrar un usuario (el rol siempre es "usuario")' })
  @ApiCreatedResponse({ type: UsuarioPublicoDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos o propiedades no permitidas (p. ej. "rol")' })
  @ApiConflictResponse({ description: 'No fue posible registrar el correo' })
  async registrar(@Body() dto: RegistroDto): Promise<UsuarioPublicoDto> {
    return UsuarioPublicoDto.from(await this.usuarios.registrar(dto));
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ type: UsuarioPublicoDto })
  @ApiUnauthorizedResponse()
  async yo(@CurrentUser() user: UsuarioAutenticado): Promise<UsuarioPublicoDto> {
    return UsuarioPublicoDto.from(await this.usuarios.buscarPorId(user.id));
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @Get()
  @ApiOperation({ summary: 'Listar usuarios (administrador)' })
  @ApiOkResponse({ type: [UsuarioAdminDto] })
  @ApiForbiddenResponse()
  async listar(): Promise<UsuarioAdminDto[]> {
    return (await this.usuarios.listar()).map(UsuarioAdminDto.fromAdmin);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Consultar un usuario (propio o administrador). Nunca devuelve passwordHash ni teléfono.' })
  @ApiOkResponse({ type: UsuarioPublicoDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Intento de consultar a otro usuario' })
  async consultar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UsuarioAutenticado,
  ): Promise<UsuarioPublicoDto> {
    return UsuarioPublicoDto.from(await this.usuarios.consultar(id, user));
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Cambiar rol o estado de un usuario (administrador)' })
  @ApiOkResponse({ type: UsuarioAdminDto })
  @ApiForbiddenResponse()
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioAdminDto,
    @CurrentUser() user: UsuarioAutenticado,
  ): Promise<UsuarioAdminDto> {
    return UsuarioAdminDto.fromAdmin(await this.usuarios.actualizarComoAdmin(id, dto, user));
  }
}
