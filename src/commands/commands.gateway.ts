import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { CreateCommandDto } from './dto/create-command.dto';

@WebSocketGateway()
export class CommandsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: any;

  private logger: Logger = new Logger('CommandsGateway');

  handleDisconnect(client: WebSocket) {
    this.logger.log(`Client disconnected`);
    client.send(JSON.stringify({ bye: 'au revoir' }));
  }

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log(`Client connected`);
    client.send(JSON.stringify({ hello: 'bonjour' }));
  }

  alertNewCommand(command: CreateCommandDto) {
    this.server.clients.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ command })),
    );
  }
}
