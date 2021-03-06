import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

import { Events, Platform } from 'ionic-angular';
import { UserData } from './user-data';

import {SecureStorage} from 'ionic-native';


@Injectable()
export class AccountData {
  data: any;
  azureAppService: Microsoft.WindowsAzure.MobileServiceClient;
  secureStorage = new SecureStorage();

  constructor(
    public http: Http,
    public user: UserData,
    public events: Events,
    public platform: Platform
  ) {
    this.platform.ready().then(() => {
      if (window['cordova']) {
        this.secureStorage.create('investmentTracker')
      }
    });
  }

  getAzureClient() {
    if (!this.azureAppService) {
      this.azureAppService = new WindowsAzure.MobileServiceClient('https://tacoinvestmenttracker.azurewebsites.net');
    }
    return this.azureAppService;
  }

  login() {
    this.platform.ready().then(() => {
      // Only enforce login when on an actual device
      if (typeof WindowsAzure !== "undefined") {
        this.getAzureClient().login("aad").done(this.loginResponse.bind(this));
      }
    })
  }

  private loginResponse(response: Microsoft.WindowsAzure.User) {
    this.events.publish('user:login');
  }

  addAccount(account: any) {
    let newAccount = {
      "name": account.name,
      "type": account.type
    };
    return this.azureAppService.getTable("Accounts").insert(newAccount);
  }

  addInvestment(investment: any) {
    //TODO: Secure the investments table so that users can't hack the accountId
    let newItem = {
      "accountId": investment.accountId,
      "symbol": investment.symbol,
      "numberOfShares": investment.numberOfShares,
      "purchaseDate": investment.purchaseDate,
      "purchasePrice": investment.purchasePrice
    };
    return this.azureAppService.getTable("Investments").insert(newItem);
  }

  processAccountData(data: Array<any>) {
    let output = [];
    data.forEach(account => {
      output.push(
        {
          id: account.id,
          name: account.name,
          type: account.type
        }
      )
    });

    return output;
  }

  processInvestmentData(data: Array<any>) {
    let output = [];
    data.forEach(item => {
      output.push(
        {
          id: item.id,
          accountId: item.accountId,
          symbol: item.symbol,
          numberOfShares: item.numberOfShares,
          purchasePrice: item.purchasePrice,
          purchaseDate: item.purchaseDate
        }
      )
    });

    return output;
  }

  getAccounts(): Promise<any[]> {
    return this.platform.ready().then(() => {
      if (typeof WindowsAzure == "undefined") {
        let savedAccounts = localStorage.getItem('accounts');
        if (savedAccounts) {
          console.log('accounts from cache')
          return JSON.parse(savedAccounts);
        }
        return new Promise(resolve => {
          // We're using Angular Http provider to request the data,
          // then on the response it'll map the JSON data to a parsed JS object.
          // Next we process the data and resolve the promise with the new data.
          this.http.get('assets/data/data.json').subscribe(res => {
            let accounts = res.json().accounts;
            localStorage.setItem('accounts', JSON.stringify(accounts));
            resolve(accounts);
          });
        });
      } else {
        return this.secureStorage.get('accounts').then(data => JSON.parse(data))
        .catch(err => {
          let accounts = this.getAzureClient().getTable("Accounts");
          return new Promise(resolve => {
            accounts.read().then((data) => {
              let accounts = this.processAccountData(data);
              this.secureStorage.set('accounts', JSON.stringify(accounts));
              resolve(accounts);
            });
          });
        })
      }
    });
  }

  getInvestments(accountId): Promise<any[]> {
    return this.platform.ready().then(() => {
      if (typeof WindowsAzure == "undefined") {
        let savedInvestments = localStorage.getItem('investments');
        if (savedInvestments) {
          console.log('investments from cache')
          return JSON.parse(savedInvestments);
        }
        return new Promise(resolve => {
          // We're using Angular Http provider to request the data,
          // then on the response it'll map the JSON data to a parsed JS object.
          // Next we process the data and resolve the promise with the new data.
          this.http.get('assets/data/data.json').subscribe(res => {
            this.data = res.json();
            localStorage.setItem('investments', JSON.stringify(this.data.investments));
            resolve(this.data.investments);
          });
        });
      } else {
        return this.secureStorage.get('investments').then(data => JSON.parse(data))
        .catch(err => {
          let investments = this.getAzureClient().getTable("Investments");
          return new Promise(resolve => {
            investments.read().then((data) => {
              let investments = this.processInvestmentData(data);
              this.secureStorage.set('investments', JSON.stringify(investments));
              resolve(investments);
            });
          });
        });
      }
    })
  }

}
