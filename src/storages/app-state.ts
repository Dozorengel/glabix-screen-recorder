import { IAppState } from "../helpers/types"

export class AppState {
  private _state: IAppState

  constructor() {
    this.init()
  }

  get state() {
    return this._state
  }

  set(newState: IAppState) {
    this._state = newState
  }

  private init() {
    this._state = {
      user: undefined,
      organization: {
        id: 16,
      },
    }
  }
}
