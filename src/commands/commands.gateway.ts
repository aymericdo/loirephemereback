import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Command } from './schemas/command.schema';

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

  alertNewCommand(command: Command) {
    this.server.clients.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ addCommand: command })),
    );
  }

  alertCloseCommand(command: Command) {
    this.server.clients.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ closeCommand: command })),
    );
  }
}
