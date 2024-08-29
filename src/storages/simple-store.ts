export class SimpleStore {
  private store: Object = {}

  get(): Object {
    return this.store
  }

  set(key: string, value: any): void {
    let obj = {}
    obj[key] = value
    this.store = { ...this.store, ...obj }
  }
}
