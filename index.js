import * as encoding from 'text-encoding';

globalThis.TextEncoder ??= encoding.TextEncoder;
globalThis.TextDecoder ??= encoding.TextDecoder;

import 'expo-router/entry';
