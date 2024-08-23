import {NotionAPI} from 'notion-client'
import {Injectable} from 'vedk'

@Injectable()
export class NotionApiClient {
  private readonly client = new NotionAPI()

  getPageDataById(id: string) {
    return this.client.getPage(id)
  }
}
