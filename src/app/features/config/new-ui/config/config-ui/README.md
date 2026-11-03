# Committee Engine – B. কনফিগারেশন (Config Service), Admin UI

## ফাইল ও screen-এর মিল

| Screen | ফাইল | API |
|---|---|---|
| B-01 ধরনের তালিকা | features/config/type-list.component.ts | GET/POST /config/committee-types, POST .../versions |
| B-02 ধরন তৈরি/সম্পাদনা | features/config/type-editor.component.ts (ট্যাব ১–৩) | GET/PUT /config/type-versions/{id} |
| B-03 যাচাই ও প্রকাশ | type-editor.component.ts (ট্যাব ৫) | POST .../validate, .../publish |
| B-04 পদবী | features/config/designation-list.component.ts | আপনার আগের ConfigService |
| B-05 স্তর, B-06 গাছ | features/config/scope-tree.component.ts + scope-node.component.ts | /config/scopes/* |
| B-07 রুটের তালিকা | features/config/route-list.component.ts | GET /config/approval-routes |
| B-08 রুট তৈরি/দেখা | features/config/route-editor.component.ts | POST, GET /{id} |
| B-09 ধারণ তালিকা | features/config/master-item.component.ts | /config/master-items?group= |
| B-10 বাড়তি field | features/config/dynamic-field-editor.component.ts (B-02 ট্যাব ৪) | version-এর `fields` |
| B-11 Label/টেমপ্লেট | features/config/label-template.component.ts | ⚠ API নেই (অনুমান) |
| B-12 আপলোড নীতি | features/config/upload-policy.component.ts | ⚠ API নেই (অনুমান) |
| B-13 পরিবর্তনের ইতিহাস | features/config/change-log.component.ts | ⚠ API নেই (অনুমান) |

সাহায্যকারী: core/models/config-admin.model.ts, core/services/config-admin.service.ts, features/config/config-shared.ts

## বসানোর ধাপ
1. `src/app` ফোল্ডারের ফাইলগুলো আপনার প্রজেক্টে একই পথে কপি করুন।
2. config-admin.service.ts-এ `environment` import ও `environment.apiUrl` আপনার প্রজেক্ট অনুযায়ী ঠিক করুন।
3. app.routes.config-snippet.ts-এর route গুলো main-layout-এর children-এ বসান (পুরনো config/* route বদলে)।
4. Menu Management (DB) থেকে মেনুতে নতুন লিংক যোগ করুন: /config/master-items, /config/labels, /config/upload-policy, /config/change-log।
5. type-editor ও route-editor আপনার আগের `ConfigService` (listDesignations) ব্যবহার করে। পথ আলাদা হলে import ঠিক করুন।

## অনুমানগুলো (মিলিয়ে নিন)
- DTO-র field-নাম (CreateCommitteeTypeRequest, UpdateVersionRequest, CreateRouteRequest, CreateNodeRequest, CreateMasterItemRequest) আমি দেখিনি। সব একই model ফাইলে, সেখানেই ঠিক করুন।
- Response `ApiResponse { success, data }` হলে service নিজে থেকে `data` খুলে নেয়।
- Scope level-এর জন্য GET API নেই, তাই স্তরের তালিকা tree থেকে বের করা হয়। node ছাড়া নতুন স্তর শুধু ওই session-এ দেখা যায়। `GET /config/scopes/levels` যোগ করলে ভালো হয়।
- Master item-এর group কোড (GO_BACK_REASON ইত্যাদি) অনুমান।
- Edit/Delete বোতাম ইচ্ছে করেই নেই (URS FR-6)। শুধু DRAFT সংস্করণের ভেতরের সারি "সরান" যায়।
