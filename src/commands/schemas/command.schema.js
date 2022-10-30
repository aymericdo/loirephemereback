"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.CommandSchema = exports.Command = void 0;
var mongoose_1 = require("@nestjs/mongoose");
var mongoose_2 = require("mongoose");
var Command = /** @class */ (function () {
    function Command() {
    }
    __decorate([
        (0, mongoose_1.Prop)({ type: [{ type: mongoose_2.Schema.Types.ObjectId, ref: 'Pastry' }] })
    ], Command.prototype, "pastries");
    __decorate([
        (0, mongoose_1.Prop)({ type: String, required: true })
    ], Command.prototype, "name");
    __decorate([
        (0, mongoose_1.Prop)({ type: String, required: true })
    ], Command.prototype, "reference");
    __decorate([
        (0, mongoose_1.Prop)({ type: Boolean, required: true, "default": false })
    ], Command.prototype, "isDone");
    __decorate([
        (0, mongoose_1.Prop)({ type: Boolean, required: true, "default": false })
    ], Command.prototype, "isPayed");
    __decorate([
        (0, mongoose_1.Prop)({ type: Number, required: true })
    ], Command.prototype, "totalPrice");
    Command = __decorate([
        (0, mongoose_1.Schema)({ timestamps: true })
    ], Command);
    return Command;
}());
exports.Command = Command;
exports.CommandSchema = mongoose_1.SchemaFactory.createForClass(Command);
