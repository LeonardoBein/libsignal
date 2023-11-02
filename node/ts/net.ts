//
// Copyright 2023 Signal Messenger, LLC.
// SPDX-License-Identifier: AGPL-3.0-only
//

import * as Native from '../Native';
import { Aci } from './Address';

// This must match the libsignal-bridge Rust enum of the same name.
export enum Environment {
  Staging = 0,
  Production = 1,
}

export type CDSAuthType = {
  username: string;
  password: string;
};

export type CDSRequestOptionsType = {
  e164s: Array<string>;
  acisAndAccessKeys: Array<{ aci: string; accessKey: string }>;
  timeout: number;
  returnAcisWithoutUaks: boolean;
};

export type CDSResponseEntryType<Aci, Pni> = {
  aci: Aci | undefined;
  pni: Pni | undefined;
};

export type CDSResponseType<Aci, Pni> = Map<
  string,
  CDSResponseEntryType<Aci, Pni>
>;

export class Net {
  private readonly _asyncContext: Native.TokioAsyncContext;
  private readonly _connectionManager: Native.ConnectionManager;

  constructor(env: Environment) {
    this._asyncContext = Native.TokioAsyncContext_new();
    this._connectionManager = Native.ConnectionManager_new(env);
  }

  async cdsiLookup(
    { username, password }: CDSAuthType,
    {
      e164s,
      acisAndAccessKeys,
      timeout,
      returnAcisWithoutUaks,
    }: CDSRequestOptionsType
  ): Promise<CDSResponseType<string, string>> {
    const request = { _nativeHandle: Native.LookupRequest_new() };
    e164s.forEach((e164) => {
      Native.LookupRequest_addE164(request, e164);
    });

    acisAndAccessKeys.forEach(({ aci: aciStr, accessKey: accessKeyStr }) => {
      Native.LookupRequest_addAciAndAccessKey(
        request,
        Aci.parseFromServiceIdString(aciStr).getServiceIdFixedWidthBinary(),
        Buffer.from(accessKeyStr, 'base64')
      );
    });

    Native.LookupRequest_setReturnAcisWithoutUaks(
      request,
      returnAcisWithoutUaks
    );

    return await Native.CdsiLookup(
      { _nativeHandle: this._asyncContext },
      { _nativeHandle: this._connectionManager },
      username,
      password,
      request,
      timeout
    );
  }
}
