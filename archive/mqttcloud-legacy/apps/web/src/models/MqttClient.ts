import mongoose, { Document, Model, Schema, Types } from "mongoose";

// A device/client identity registered under an MqttUser credential set.
// The broker service only lets a TCP client connect as `clientName` if a
// matching document exists here for the authenticating `mqttUserId`.
export interface IMqttClient extends Document {
  userId: Types.ObjectId;
  mqttUserId: Types.ObjectId;
  clientName: string;
  isOnline: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MqttClientSchema = new Schema<IMqttClient>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },
    mqttUserId: { type: Schema.Types.ObjectId, ref: "MqttUser", required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    isOnline:   { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A client id must be unique within its credential set, not globally.
MqttClientSchema.index({ mqttUserId: 1, clientName: 1 }, { unique: true });

delete mongoose.models["MqttClient"];
const MqttClient: Model<IMqttClient> = mongoose.model<IMqttClient>("MqttClient", MqttClientSchema);

export default MqttClient;
