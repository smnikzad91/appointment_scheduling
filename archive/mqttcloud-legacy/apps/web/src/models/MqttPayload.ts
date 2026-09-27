import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Rolling log of published messages, written by the standalone broker service.
// Auto-expires after 7 days via the TTL index below — this is a debugging aid,
// not a message store.
export interface IMqttPayload extends Document {
  userId: Types.ObjectId;
  mqttUserId: Types.ObjectId;
  clientName: string;
  topic: string;
  payload: string;
  createdAt: Date;
}

const MqttPayloadSchema = new Schema<IMqttPayload>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },
    mqttUserId: { type: Schema.Types.ObjectId, ref: "MqttUser", required: true, index: true },
    clientName: { type: String, required: true },
    topic:      { type: String, required: true },
    payload:    { type: String, default: "", maxlength: 4000 },
    createdAt:  { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
  },
  { timestamps: false }
);

delete mongoose.models["MqttPayload"];
const MqttPayload: Model<IMqttPayload> = mongoose.model<IMqttPayload>("MqttPayload", MqttPayloadSchema);

export default MqttPayload;
