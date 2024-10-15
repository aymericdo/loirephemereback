import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { instanceToPlain } from 'class-transformer';
import { Request } from 'express';
import { WsJwtAuthGuard } from 'src/auth/ws-jwt-auth.guard';
import { UpdateCommandDto } from 'src/commands/dto/update-command.dto';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { CommandEntity } from 'src/commands/serializers/command.serializer';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { WsThrottlerGuard } from 'src/shared/guards/ws-throttler.guard';
import { UsersService } from 'src/users/users.service';
import WebSocket, { Server } from 'ws';

interface Client extends WebSocket {
  request: Request;
}

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
@WebSocketGateway()
@UseGuards(WsThrottlerGuard)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly usersService: UsersService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @WebSocketServer() server: Server;
  clients: { [code: string]: Client[] } = {};
  commandsAdmins: { [code: string]: Client[] } = {};
  menuAdmins: { [code: string]: Client[] } = {};

  clientWaitingQueue: { [commandId: string]: Client } = {};

  private logger: Logger = new Logger(SocketGateway.name);

  handleDisconnect(client: Client) {
    const code = this.getCodeFromQueryParam(client.request.url);
    this.clients[code] = this.clients[code]?.filter((c) => c !== client) || [];
    this.commandsAdmins[code] =
      this.commandsAdmins[code]?.filter((c) => c !== client) || [];
    this.menuAdmins[code] =
      this.menuAdmins[code]?.filter((c) => c !== client) || [];

    this.logger.log(`Client disconnected`);
    client.send(JSON.stringify({ bye: 'au revoir' }));
  }

  handleConnection(client: Client, request: Request) {
    const code = this.getCodeFromQueryParam(request.url);
    this.logger.log('Client connected');
    client['request'] = request;
    client.send(JSON.stringify({ hello: 'bonjour' }));

    if (this.clients.hasOwnProperty(code)) {
      this.clients[code].push(client);
    } else {
      this.clients[code] = [client];
    }
  }

  alertNewCommand(restaurantCode: string, command: CommandDocument) {
    const serializeCommand = instanceToPlain(
      new CommandEntity(command.toObject()),
      {
        groups: ['admin'],
      },
    );
    this.commandsAdmins[restaurantCode]?.forEach((client: Client) =>
      client.send(JSON.stringify({ addCommand: serializeCommand })),
    );
  }

  alertCloseCommand(code: string, command: CommandDocument) {
    const serializeCommand = instanceToPlain(
      new CommandEntity(command.toObject()),
      {
        groups: ['admin'],
      },
    );
    this.commandsAdmins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ closeCommand: serializeCommand })),
    );
  }

  alertPayedCommand(code: string, command: CommandDocument) {
    const serializeCommand = instanceToPlain(
      new CommandEntity(command.toObject()),
      {
        groups: ['admin'],
      },
    );
    this.commandsAdmins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ payedCommand: serializeCommand })),
    );

    // remove old waiting info
    // delete this.clientWaitingQueue[command._id];
  }

  stockChanged(code: string, newStock: { pastryId: string; newStock: number }) {
    this.clients[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  stockChangedAdmin(
    code: string,
    newStock: { pastryId: string; newStock: number },
  ) {
    this.menuAdmins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  @SubscribeMessage('wizzer')
  onWizzer(@MessageBody() command: UpdateCommandDto): void {
    this.webPushGateway.sendCommandReady({ ...command, _id: command._id });

    const ws = this.clientWaitingQueue[command._id];

    if (ws) {
      ws.send(JSON.stringify({ wizz: { commandId: command._id } }));
    }
  }

  @SubscribeMessage('addWaitingQueue')
  onAddWaitingQueue(
    @MessageBody() command: UpdateCommandDto,
    @ConnectedSocket() client: Client,
  ): void {
    this.clientWaitingQueue[command._id] = client;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('commandsAuthorization')
  async onCommandsAuthorization(
    @ConnectedSocket() client: Client,
  ): Promise<void> {
    const code = this.getCodeFromQueryParam(client.request.url);

    const userId = (client.request.user as { userId: string }).userId;
    const user = await this.usersService.findOne(userId);

    if (!(await this.usersService.isAuthorized(user, code, ['commands']))) {
      return;
    }

    if (this.commandsAdmins.hasOwnProperty(code)) {
      this.commandsAdmins[code].push(client);
    } else {
      this.commandsAdmins[code] = [client];
    }

    this.logger.log('Admin Commands connected');
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('menuAuthorization')
  async onMenuAuthorization(@ConnectedSocket() client: Client): Promise<void> {
    const code = this.getCodeFromQueryParam(client.request.url);

    const userId = (client.request.user as { userId: string }).userId;
    const user = await this.usersService.findOne(userId);

    if (!(await this.usersService.isAuthorized(user, code, ['menu']))) {
      return;
    }

    if (this.menuAdmins.hasOwnProperty(code)) {
      this.menuAdmins[code].push(client);
    } else {
      this.menuAdmins[code] = [client];
    }

    this.logger.log('Admin Menu connected');
  }

  cleanup() {
    this.commandsAdmins = {};
    this.menuAdmins = {};
    this.clients = {};
    this.clientWaitingQueue = {};
  }

  private getCodeFromQueryParam(url: string): string {
    const queryParams = new URLSearchParams(url.substring(1));
    return queryParams.get('code');
  }
}
