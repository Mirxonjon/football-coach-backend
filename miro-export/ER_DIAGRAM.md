# ER-diagramma (Mermaid)

> Quyidagi Mermaid blokini Miro AI, ChatGPT, Claude yoki [mermaid.live](https://mermaid.live) ga joylashtirib, vizual ER-diagrammani oling.

```mermaid
erDiagram
    ROLE ||--o{ USER : "has"
    USER ||--o| CARD : "owns one"
    USER ||--o{ SUBSCRIPTION : "has"
    USER ||--o{ WALLET_TRANSACTION : "makes"
    USER ||--o{ USER_BOOK : "purchases"
    USER ||--o{ BOOK_PROGRESS : "tracks"
    USER ||--o{ LESSON_PROGRESS : "tracks"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AI_CHAT : "owns"
    USER ||--o{ USER_DEVICE : "registers"
    USER ||--o{ SESSION : "logs in"
    USER ||--o{ OTP_CODE : "requests"

    SUBSCRIPTION_PLAN ||--o{ SUBSCRIPTION : "selected by"
    SUBSCRIPTION_PLAN ||--o{ WALLET_TRANSACTION : "paid for"
    CARD ||--o{ WALLET_TRANSACTION : "charged"
    CARD ||--o{ SUBSCRIPTION : "linked for auto-pay"

    AGE_CATEGORY ||--o{ TRAINING_CATEGORY : "groups"
    TRAINING_CATEGORY ||--o{ TRAINING_LESSON : "contains"
    TRAINING_LESSON ||--o{ LESSON_BLOCK : "consists of"
    TRAINING_LESSON ||--o{ LESSON_PROGRESS : "tracked by"

    MASTERCLASS_CATEGORY ||--o{ MASTERCLASS : "contains"
    MASTERCLASS ||--o{ MASTERCLASS_BLOCK : "consists of"

    BOOK_CATEGORY ||--o{ BOOK : "contains"
    BOOK ||--o{ USER_BOOK : "purchased as"
    BOOK ||--o{ BOOK_PROGRESS : "read as"

    AI_CHAT ||--o{ AI_MESSAGE : "contains"
    AI_MESSAGE ||--o{ AI_MESSAGE_IMAGE : "attaches"

    LEGAL ||--o{ LEGAL_TRANSLATION : "has"

    USER {
        int id PK
        string phone UK
        string email UK
        string password
        string googleId UK
        string firstName
        string lastName
        bool isVerified
        bool isActive
        int roleId FK
    }

    ROLE {
        int id PK
        string name UK "USER | ADMIN"
    }

    CARD {
        int id PK
        int userId FK UK
        string provider "click"
        string token "Click card_token, server-only"
        string cardNumber "masked"
        string last4
        string expireDate "MMYY"
        string phoneNumber
        bool isActive
        bool isVerified
    }

    WALLET_TRANSACTION {
        int id PK
        int userId FK
        int cardId FK
        int subscriptionsPlansId FK
        float amount
        string provider "click | dev"
        enum status "PENDING | SUCCESS | FAILED"
        string externalId
        string errorCode
        string errorMessage
    }

    SUBSCRIPTION_PLAN {
        int id PK
        string titleUz
        string titleRu
        int durationDays
        float basePrice
        enum discountType "NONE | PERCENTAGE | FIXED_PRICE"
        int discountPercent
        float fixedDiscountPrice
        bool isActive
    }

    SUBSCRIPTION {
        int id PK
        int userId FK
        int subscriptionsPlansId FK
        datetime startDate
        datetime endDate
        bool isActive
        bool autoPay
        int cardId FK
        datetime lastRenewalAttemptAt
        int lastExpiryNoticeDay
    }

    AGE_CATEGORY {
        int id PK
        string titleUz
        string titleRu
        int minAge
        int maxAge
        string iconUrl
    }

    TRAINING_CATEGORY {
        int id PK
        string titleUz
        string titleRu
        int ageCategoriesId FK
        string descriptionUz
        string descriptionRu
        string imageUrl
    }

    TRAINING_LESSON {
        int id PK
        int trainingCategoryId FK
        string titleUz
        string titleRu
        bool isFree
    }

    LESSON_BLOCK {
        int id PK
        int lessonId FK
        enum blockType "TITLE | TEXT | VIDEO | IMAGE | FILE | HINT"
        string contentUz
        string contentRu
        int duration
        int sequenceOrder
        bool isFree
    }

    LESSON_PROGRESS {
        int id PK
        int userId FK
        int lessonId FK
        int lastBlockSequence
        bool isCompleted
    }

    MASTERCLASS_CATEGORY {
        int id PK
        string titleUz
        string titleRu
        string descriptionUz
        string descriptionRu
        string imageUrl
    }

    MASTERCLASS {
        int id PK
        int masterclassCategoryId FK
        string titleUz
        string titleRu
    }

    MASTERCLASS_BLOCK {
        int id PK
        int masterclassId FK
        enum blockType
        string contentUz
        string contentRu
        int duration
        int sequenceOrder
    }

    BOOK_CATEGORY {
        int id PK
        string titleUz
        string titleRu
        enum categoryType "BOOK | KONSPEKT"
    }

    BOOK {
        int id PK
        int bookCategoryId FK
        string titleUz
        string titleRu
        string fileUrl
        float basePrice
        enum discountType
        int discountPercent
        float fixedDiscountPrice
        string coverImageUrl
        string descriptionUz
        string descriptionRu
    }

    USER_BOOK {
        int id PK
        int userId FK
        int bookId FK
        bool isActive
        datetime acquiredAt
    }

    BOOK_PROGRESS {
        int id PK
        int userId FK
        int bookId FK
        int lastPageRead
        bool isCompleted
    }

    AI_CHAT {
        int id PK
        int userId FK
        string title
    }

    AI_MESSAGE {
        int id PK
        int chatId FK
        enum role "user | assistant"
        string messageText
    }

    NOTIFICATION {
        int id PK
        int userId FK
        enum type "SYSTEM | LESSON | BOOK | SUBSCRIPTION | AI_CHAT"
        string titleUz
        string titleRu
        string messageUz
        string messageRu
        bool isRead
        int relatedId
    }

    USER_DEVICE {
        int id PK
        int userId FK
        string fcmToken UK
        string deviceType
    }
```

## Asosiy klasterlar

- **Identity klaster:** Role, User, Session, OtpCode
- **O'quv klaster:** AgeCategory → TrainingCategory → TrainingLesson → LessonBlock + LessonProgress
- **Master-klass klaster:** MasterclassCategory → Masterclass → MasterclassBlock
- **Kitob klaster:** BookCategory → Book → UserBook + BookProgress
- **To'lov klaster:** Card, SubscriptionPlan, Subscription, WalletTransaction
- **Aloqa klaster:** Notification, UserDevice
- **AI klaster:** AiChat → AiMessage → AiMessageImage
