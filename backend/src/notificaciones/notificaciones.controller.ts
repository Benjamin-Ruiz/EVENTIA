import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get('mias')
  @ApiOperation({ summary: 'Notificaciones del usuario autenticado' })
  mias(@CurrentUser() user: UsuarioAutenticado) {
    return this.notificaciones.misNotificaciones(user.id);
  }

  @Patch(':id/leida')
  @ApiOperation({ summary: 'Marcar una notificación propia como leída' })
  leida(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UsuarioAutenticado) {
    return this.notificaciones.marcarLeida(id, user.id);
  }
}
