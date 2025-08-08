module nickname_nft::nickname_nft {
    use sui::object::UID;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::url::Url;
    use std::string::{String, utf8};
    use sui::display;
    use sui::package;
    use sui::event;

    // Структура NFT никнейма
    public struct NicknameNFT has key, store {
        id: UID,
        nickname: String,
        owner: address,
        created_at: u64,
        image_url: Url,
        description: String,
    }

    // Реестр никнеймов для предотвращения дубликатов
    public struct NicknameRegistry has key {
        id: UID,
        nicknames: vector<String>,
    }

    // Административные права
    public struct AdminCap has key {
        id: UID,
    }

    // Событие создания NFT
    public struct NicknameNFTMinted has copy, drop {
        nft_id: address,
        nickname: String,
        owner: address,
    }

    // Одноразовый свидетель для создания Display
    public struct NICKNAME_NFT has drop {}

    // Инициализация модуля
    fun init(otw: NICKNAME_NFT, ctx: &mut TxContext) {
        let keys = vector[
            utf8(b"name"),
            utf8(b"description"),
            utf8(b"image_url"),
            utf8(b"creator"),
        ];

        let values = vector[
            utf8(b"{nickname}"),
            utf8(b"Unique nickname NFT: {nickname}"),
            utf8(b"{image_url}"),
            utf8(b"STVOR Marketplace"),
        ];

        // Создаем Publisher
        let publisher = package::claim(otw, ctx);

        // Создаем Display
        let mut display = display::new_with_fields<NicknameNFT>(
            &publisher, keys, values, ctx
        );

        display::update_version(&mut display);

        // Передаем объекты
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));

        // Создаем реестр никнеймов
        let registry = NicknameRegistry {
            id: object::new(ctx),
            nicknames: vector::empty(),
        };

        // Создаем административные права
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(registry);
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // Создание NFT никнейма
    public fun mint_nickname_nft(
        registry: &mut NicknameRegistry,
        nickname: String,
        description: String,
        _image_url: vector<u8>,
        ctx: &mut TxContext
    ): NicknameNFT {
        // Проверяем уникальность никнейма
        assert!(!vector::contains(&registry.nicknames, &nickname), 1);

        // Добавляем никнейм в реестр
        vector::push_back(&mut registry.nicknames, nickname);

        // Создаем URL для изображения
        let image_url = sui::url::new_unsafe_from_bytes(_image_url);

        // Создаем NFT
        let nft = NicknameNFT {
            id: object::new(ctx),
            nickname,
            owner: tx_context::sender(ctx),
            created_at: tx_context::epoch(ctx),
            image_url,
            description,
        };

        // Эмитируем событие
        event::emit(NicknameNFTMinted {
            nft_id: object::uid_to_address(&nft.id),
            nickname: nft.nickname,
            owner: nft.owner,
        });

        nft
    }

    // Передача NFT
    public fun transfer_nft(nft: NicknameNFT, recipient: address) {
        transfer::public_transfer(nft, recipient);
    }

    // Получение никнейма из NFT
    public fun get_nickname(nft: &NicknameNFT): String {
        nft.nickname
    }

    // Получение владельца NFT
    public fun get_owner(nft: &NicknameNFT): address {
        nft.owner
    }

    // Получение времени создания
    public fun get_created_at(nft: &NicknameNFT): u64 {
        nft.created_at
    }

    // Проверка существования никнейма
    public fun nickname_exists(registry: &NicknameRegistry, nickname: String): bool {
        vector::contains(&registry.nicknames, &nickname)
    }
}
