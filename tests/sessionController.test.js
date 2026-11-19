const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const controllerPath = path.join(
  __dirname,
  "..",
  "controllers",
  "sessionController",
  "sessionController.js"
);
const mockState = {
  request: null,
  partner: null,
  conversations: new Map(),
  transactionError: null,
};

const SessionRequest = {
  findById() {
    return {
      populate: async () => mockState.request,
    };
  },
};
const Partner = {
  findById: async () => mockState.partner,
};
const User = {};
const FieldValue = {
  arrayUnion: (...values) => ({ operation: "arrayUnion", values }),
  serverTimestamp: () => ({ operation: "serverTimestamp" }),
};

const firestore = {
  collection: () => ({
    doc: (id) => ({ id }),
  }),
  runTransaction: async (callback) => {
    if (mockState.transactionError) {
      throw mockState.transactionError;
    }

    await callback({
      get: async (ref) => ({
        exists: mockState.conversations.has(ref.id),
      }),
      set: (ref, data) => {
        const existing = mockState.conversations.get(ref.id) || {};
        const updated = { ...existing };

        for (const [key, value] of Object.entries(data)) {
          if (value && value.operation === "arrayUnion") {
            const participants = Array.isArray(updated[key]) ? updated[key] : [];
            updated[key] = [...participants];
            for (const participant of value.values) {
              if (!updated[key].includes(participant)) {
                updated[key].push(participant);
              }
            }
          } else if (
            !value ||
            typeof value !== "object" ||
            value.operation !== "serverTimestamp"
          ) {
            updated[key] = value;
          } else if (!Object.prototype.hasOwnProperty.call(updated, key)) {
            updated[key] = value;
          }
        }

        mockState.conversations.set(ref.id, updated);
      },
    });
  },
};
const admin = {
  firestore,
  database: () => ({
    ref: () => ({
      remove: async () => {},
      set: async () => {},
      update: async () => {},
    }),
  }),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && parent.filename === controllerPath) {
    if (request === "../../models/SessionRequest/SessionRequest") return SessionRequest;
    if (request === "../../models/Partner/Partner") return Partner;
    if (request === "../../models/User") return User;
    if (request === "firebase-admin/firestore") return { FieldValue };
    if (request === "../../config/firebase") return admin;
    if (request === "../../services/exotelService") {
      return { triggerExotelCall: async () => {} };
    }
    if (request === "../../services/bookingEventsService") {
      return { sendBookingConfirmedEvent: async () => {} };
    }
  }

  return originalLoad.call(this, request, parent, isMain);
};
const { respondToSessionRequest } = require(controllerPath);
Module._load = originalLoad;

function makeRequest() {
  return {
    _id: "request-1",
    status: "pending",
    type: "chat",
    user: {
      _id: "mongo-client-id",
      firebaseUid: "firebase-client-uid",
      fullName: "Client Name",
    },
    partner: {
      _id: "mongo-partner-id",
      name: "Partner Name",
    },
    saveCalls: 0,
    async save() {
      this.saveCalls += 1;
    },
  };
}

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function acceptChat() {
  const res = makeResponse();
  await respondToSessionRequest(
    {
      user: { id: "mongo-partner-id" },
      body: {
        requestId: "request-1",
        action: "accept",
        clientUid: "untrusted-client-uid",
        partnerUid: "untrusted-partner-uid",
      },
    },
    res
  );
  return res;
}

test.beforeEach(() => {
  mockState.request = makeRequest();
  mockState.partner = {
    _id: "mongo-partner-id",
    firebaseUid: "firebase-partner-uid",
    fullName: "Authenticated Partner",
  };
  mockState.conversations = new Map();
  mockState.transactionError = null;
});

test("accept creates the Firestore conversation with Firebase participants", async () => {
  const res = await acceptChat();

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.clientUid, "firebase-client-uid");
  assert.equal(res.body.clientName, "Client Name");
  assert.equal(res.body.conversationId, res.body.chatRoomId);

  const conversation = mockState.conversations.get(res.body.conversationId);
  assert.deepEqual(conversation.participants, [
    "firebase-client-uid",
    "firebase-partner-uid",
  ]);
  assert.equal(conversation.clientName, "Client Name");
  assert.equal(conversation.partnerName, "Authenticated Partner");
});

test("accept does not use the Mongo client ID as a Firebase UID", async () => {
  const res = await acceptChat();
  const conversation = mockState.conversations.get(res.body.conversationId);

  assert.equal(res.body.clientUid, "firebase-client-uid");
  assert.equal(conversation.userId, "firebase-client-uid");
  assert.equal(conversation.participants.includes("mongo-client-id"), false);
});

test("accept fails clearly when a Firebase UID cannot be resolved", async () => {
  mockState.request.user.firebaseUid = null;

  const res = await acceptChat();

  assert.equal(res.statusCode, 500);
  assert.match(res.body.message, /Unable to resolve Firebase UID/);
  assert.equal(mockState.request.status, "pending");
  assert.equal(mockState.conversations.size, 0);
});

test("repeated accept reuses the conversation and preserves chat history", async () => {
  const firstResponse = await acceptChat();
  const conversationId = firstResponse.body.conversationId;
  const conversation = mockState.conversations.get(conversationId);
  conversation.messages = [{ text: "existing message" }];

  const secondResponse = await acceptChat();

  assert.equal(secondResponse.statusCode, 200);
  assert.equal(secondResponse.body.conversationId, conversationId);
  assert.deepEqual(
    mockState.conversations.get(conversationId).participants,
    ["firebase-client-uid", "firebase-partner-uid"]
  );
  assert.deepEqual(
    mockState.conversations.get(conversationId).messages,
    [{ text: "existing message" }]
  );
});

test("Firestore failures are returned as an error instead of acceptance", async () => {
  mockState.transactionError = new Error("Firestore unavailable");

  const res = await acceptChat();

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Failed to create or update/);
  assert.equal(mockState.request.status, "pending");
  assert.equal(mockState.request.saveCalls, 0);
  assert.equal(mockState.conversations.size, 0);
});
