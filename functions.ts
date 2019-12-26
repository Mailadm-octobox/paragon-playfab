var COMMERCE_CATALOG = "Commerce";
var GOLD = "GP";
var BATTLE_PASS_EXPERIENCE = "BE";

// DAILY 07 BLOCK PARAMETERS
{
    var D07_ITEM_NAME = "D07-Reward_";
    var D07_REWARD_TABLE = "D07-RewardTable";
    var D07_LOGIN_STREAK = "D07-LoginStreak";
    var D07_NEXT_GRANT = "D07-NextEligibleGrant";
}

// BATTLE PASS BLOCK PARAMETERS
{
    var BP_PRICE = "BP-Price";
    var BP_SCHEDULE = "BP-Schedule";
    var BP_EXPIRATION_TIME = "BP-ExpirationTime";
    var BP_EXPERIENCE_TABLE = "BP-ExperienceTable";
    var BP_FREE_REWARD_TABLE = "BP-FreeRewardTable";
    var BP_PREMIUM_REWARD_TABLE = "BP-PremiumRewardTable";
    var BP_ACQUIRED_FREE_REWARD	= "BP-AcquiredFreeReward";
    var BP_ACQUIRED_PREMIUM_REWARD ="BP-AcquiredPremiumReward";
}

handlers.NewUserInitialization = function(args, context)
{
    log.info("Granting initial items for " +  (currentPlayerId));
    var GrantItemsToUserRequest =
    {
        "PlayFabId": currentPlayerId,
        "ItemIds" : ["default"]
    };

    GrantItemsToUserRequest.CatalogVersion = "Avatar";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "CharacterAvatar";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "Chessboard";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "GraffitiWinner";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "ParticleCelebrate";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "ParticleDamage";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "ParticleDeploy";
    server.GrantItemsToUser(GrantItemsToUserRequest);
    GrantItemsToUserRequest.CatalogVersion = "ParticleInvade";
    server.GrantItemsToUser(GrantItemsToUserRequest);

    log.info("Settings initial items for " + (currentPlayerId));
    var EquippedItems = "{\"Avatar\": \"default\",\"CharacterAvatar\": \"default\",\"Chessboard\": \"default\",\"GraffitiWinner\": \"default\",\"ParticleCelebrate\": \"default\",\"ParticleDamage\": \"default\",\"ParticleDeploy\": \"default\",\"ParticleInvade\": \"default\"}";

    var UpdateUserDataRequest =
    {
        "PlayFabId": currentPlayerId,
        "Data":
        {
            "EquippedItems": EquippedItems
        }
    };
    server.UpdateUserData(UpdateUserDataRequest);
}

handlers.DailyCheckIn = function (args, context)
{
    log.info("Daily Check In " + (currentPlayerId));
    var GetUserReadOnlyDataRequest =
    {
        "PlayFabId": currentPlayerId,
        "Keys": [D07_LOGIN_STREAK, D07_NEXT_GRANT]
    };
    var GetUserReadOnlyDataResponse = server.GetUserReadOnlyData(GetUserReadOnlyDataRequest);

    var today = new Date();
    today.setHours(0, 0, 0);

    var claimed = true;
    var streak = 1;
    var streakDay = new Date();
    streakDay.setDate(today.getDate() - 1);

    if(GetUserReadOnlyDataResponse.Data.hasOwnProperty(D07_NEXT_GRANT))
    {
        streak = parseInt(GetUserReadOnlyDataResponse.Data[D07_LOGIN_STREAK].Value);
        streakDay = new Date(GetUserReadOnlyDataResponse.Data[D07_NEXT_GRANT].Value);

        var daysBetween = Math.round((today.getTime()-streakDay.getTime())/(1000*60*60*24));
        if(daysBetween == 1)
        {
            streak += 1;
        }
        else if (0 >= daysBetween)
        {
            claimed = false;
        }
        else
        {
            streak = 1;
        }
    }

    var result =
    {
        "RewardClaimed": claimed,
        "Streak": streak
    }

    if (!claimed)
        return result;

    if (streak == 7)
        streak = 0;

    // Get this title's reward table so we know what items to grant.
    var GetTitleDataRequest = {"Keys": [ D07_REWARD_TABLE ]};
    var GetTitleDataResult = server.GetTitleData(GetTitleDataRequest);
    if(!GetTitleDataResult.Data.hasOwnProperty(D07_REWARD_TABLE))
    {
        log.error("Rewards table could not be found. No rewards will be given. Exiting...");
        return result;
    }
    else
    {
        // parse our reward table and find a matching reward
        var reward;
        var rewards = JSON.parse(GetTitleDataResult.Data[D07_REWARD_TABLE]);
        for(var element in rewards)
        {
            if((D07_ITEM_NAME+result.Streak) >= rewards[element].RewardId)
            {
                reward = rewards[element];
            }
        }

        var GrantItemsToUserRequest =
        {
            "PlayFabId": currentPlayerId,
            "CatalogVersion": reward.ItemClass
        };
        GrantItemsToUserRequest.ItemIds = [reward.ItemId];
        server.GrantItemsToUser(GrantItemsToUserRequest);

        var UpdateUserReadOnlyDataRequest =
        {
            "PlayFabId": currentPlayerId,
            "Data": {}
        };
        UpdateUserReadOnlyDataRequest.Data[D07_LOGIN_STREAK] = result.Streak;
        UpdateUserReadOnlyDataRequest.Data[D07_NEXT_GRANT] = today;
        server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
        return result;
    }
}

handlers.ProvideConsumables = function (args, context)
{
    log.info("Request Parameters: " + (args));
    var GrantItemsToUserRequest =
    {
        "PlayFabId": currentPlayerId,
        "CatalogVersion": COMMERCE_CATALOG
    };
    GrantItemsToUserRequest.ItemIds = args.packs;
    var GrantItemsToUserResult = server.GrantItemsToUser(GrantItemsToUserRequest);
    log.info("GrantItemsToUserResult:" + (GrantItemsToUserResult));
}

handlers.PurchaseBattlePass = function (args, context)
{
    log.info("Purchase Battle Pass for " + (currentPlayerId) + " started");
    var result =
    {
        "Success": false,
        "ItemNotFound": false,
        "InsufficientFunds": false
    }

    var GetUserReadOnlyDataRequest =
    {
        "PlayFabId": currentPlayerId,
        "Keys": [BP_EXPIRATION_TIME, BP_ACQUIRED_FREE_REWARD, BP_ACQUIRED_PREMIUM_REWARD]
    };
    var GetUserReadOnlyDataResponse = server.GetUserReadOnlyData(GetUserReadOnlyDataRequest);
    if(GetUserReadOnlyDataResponse.Data.hasOwnProperty(BP_EXPIRATION_TIME))
    {
        var today = new Date();
        today.setDate(today.getDate() - 1);
        ExpirationTime = new Date(GetUserReadOnlyDataResponse.Data[BP_EXPIRATION_TIME].Value);
        var daysBetween = Math.round((ExpirationTime.getTime()-today.getTime())/(1000*60*60*24));
        if(daysBetween >= 0)
        {
            result.Success = true;
            result.ItemNotFound = true;
            return result;
        }
    }

    // Get this title's reward table so we know what items to grant. 
    var GetTitleDataRequest = {"Keys": [ BP_PRICE, BP_SCHEDULE ]}; 
    var GetTitleDataResult = server.GetTitleData(GetTitleDataRequest);
    if(!GetTitleDataResult.Data.hasOwnProperty(BP_PRICE) || !GetTitleDataResult.Data.hasOwnProperty(BP_SCHEDULE))
    {
        log.error("Battle Pass Price or Schedule could not be found. Exiting...");
        result.ItemNotFound = true;
        return result;
    }
    else
    {
        var GetUserInventoryRequest = { "PlayFabId": currentPlayerId };
        var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
        if (GetUserInventoryResult.VirtualCurrency.hasOwnProperty(GOLD))
        {
            if (GetUserInventoryResult.VirtualCurrency[GOLD] >= GetTitleDataResult.Data[BP_PRICE])
            {
                var UpdateUserReadOnlyDataRequest = { "PlayFabId": currentPlayerId, "Data": {} };
                var schedule = JSON.parse(GetTitleDataResult.Data[BP_SCHEDULE]);
                UpdateUserReadOnlyDataRequest.Data[BP_EXPIRATION_TIME] = schedule.end;
                server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
                var SubtractUserVirtualCurrencyRequest = { "Amount": GetTitleDataResult.Data[BP_PRICE], "PlayFabId": currentPlayerId, "VirtualCurrency": GOLD };
                SubtractUserVirtualCurrencyResult = server.SubtractUserVirtualCurrency(SubtractUserVirtualCurrencyRequest);
                result.Success = true;
                return result;
            }
            else
            {
                result.InsufficientFunds = true;
                return result;
            }
        }
    }
}

handlers.ClaimBattlePassReward = function (args, context)
{
    log.info("Player: " + (currentPlayerId) + "claim Free(" + (args.freereward) + ") Battle Pass Reward for level " + (args.level));
    var result =
    {
        "Success": false,
        "ItemNotFound": false,
        "InsufficientLevel": false
    }

    // Get this title's reward table so we know what items to grant.
    var GetTitleDataRequest = {"Keys": [BP_SCHEDULE, BP_EXPERIENCE_TABLE, BP_FREE_REWARD_TABLE, BP_PREMIUM_REWARD_TABLE]};
    var GetTitleDataResult = server.GetTitleData(GetTitleDataRequest);
    if(!GetTitleDataResult.Data.hasOwnProperty(BP_EXPERIENCE_TABLE) || !GetTitleDataResult.Data.hasOwnProperty(BP_FREE_REWARD_TABLE) || !GetTitleDataResult.Data.hasOwnProperty(BP_PREMIUM_REWARD_TABLE))
    {
        log.error("Battle Pass EXPERIENCE_TABLE or FREE_REWARD_TABLE or PREMIUM_REWARD_TABLE could not be found. Exiting...");
        result.ItemNotFound = true;
        return result;
    }
    else
    {
        var GetUserInventoryRequest = { "PlayFabId": currentPlayerId };
        var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
        if (GetUserInventoryResult.VirtualCurrency.hasOwnProperty(BATTLE_PASS_EXPERIENCE))
        {
            var ExperienceTable = JSON.parse(GetTitleDataResult.Data[BP_EXPERIENCE_TABLE]);
            var playerLevel = 0;
            var prevExperience = 0;
            for (var element in ExperienceTable)
            {
                var leftCheck = GetUserInventoryResult.VirtualCurrency[BATTLE_PASS_EXPERIENCE] >= prevExperience;
                var rightCheck = GetUserInventoryResult.VirtualCurrency[BATTLE_PASS_EXPERIENCE] < ExperienceTable[element].Experience;
                if(leftCheck && rightCheck)
                {
                    playerLevel = ExperienceTable[element].Level;
                    break;
                }
                else
                {
                    prevExperience = ExperienceTable[element].Experience;
                }
            }

            if (playerLevel >= args.level)
            {
                var GetUserReadOnlyDataRequest =
                {
                    "PlayFabId": currentPlayerId,
                    "Keys": [BP_EXPIRATION_TIME, BP_ACQUIRED_FREE_REWARD, BP_ACQUIRED_PREMIUM_REWARD]
                };
                var GetUserReadOnlyDataResponse = server.GetUserReadOnlyData(GetUserReadOnlyDataRequest);

                var AcquiredReward;
                if (args.freereward)
                {
                    if(GetUserReadOnlyDataResponse.Data.hasOwnProperty(BP_ACQUIRED_FREE_REWARD))
                    {
                        AcquiredReward = JSON.parse(GetUserReadOnlyDataResponse.Data[BP_ACQUIRED_FREE_REWARD].Value);
                    }
                }
                else
                {
                    if(GetUserReadOnlyDataResponse.Data.hasOwnProperty(BP_ACQUIRED_PREMIUM_REWARD))
                    {
                        AcquiredReward = JSON.parse(GetUserReadOnlyDataResponse.Data[BP_ACQUIRED_PREMIUM_REWARD].Value);
                    }
                }

                for (var element in AcquiredReward)
                {
                    if (AcquiredReward[element].Level == args.level)
                    {
                        result.ItemNotFound = true;
                        return result;
                    }
                }

                var ShouldGrant = args.freereward;
                if (!ShouldGrant)
                {
                    if(GetUserReadOnlyDataResponse.Data.hasOwnProperty(BP_EXPIRATION_TIME))
                    {
                        var today = new Date();
                        today.setDate(today.getDate() - 1);
                        ExpirationTime = new Date(GetUserReadOnlyDataResponse.Data[BP_EXPIRATION_TIME].Value);
                        var daysBetween = Math.round((ExpirationTime.getTime()-today.getTime())/(1000*60*60*24));
                        if(daysBetween >= 0)
                        {
                            ShouldGrant = true;
                        }
                    }
                }

                if(ShouldGrant)
                {
                    var reward;
                    result.ItemNotFound = true;
                    if(args.freereward)
                    {
                        var FreeRewardTable = JSON.parse(GetTitleDataResult.Data[BP_FREE_REWARD_TABLE]);
                        for (var element in FreeRewardTable)
                        {
                            if (FreeRewardTable[element].Level == args.level)
                            {
                                reward = FreeRewardTable[element].Reward;
                                result.ItemNotFound = false;
                                break;
                            }
                        }
                    }
                    else
                    {
                        var PremiumRewardTable = JSON.parse(GetTitleDataResult.Data[BP_PREMIUM_REWARD_TABLE]);
                        for (var element in PremiumRewardTable)
                        {
                            if (PremiumRewardTable[element].Level == args.level)
                            {
                                reward = PremiumRewardTable[element].Reward;
                                result.ItemNotFound = false;
                                break;
                            }
                        }
                    }

                    if(!result.ItemNotFound)
                    {
                        var GrantItemsToUserRequest =
                        {
                            "PlayFabId": currentPlayerId,
                            "CatalogVersion": reward.ItemClass
                        };
                        GrantItemsToUserRequest.ItemIds = [reward.ItemId];
                        server.GrantItemsToUser(GrantItemsToUserRequest);
                        var newAcquiredReward = {"Level": args.level, "Reward": {"RewardId": reward.RewardId, "ItemClass": reward.ItemClass, "ItemId": reward.ItemId}};
                        if (!AcquiredReward)
                            AcquiredReward = [];

                        AcquiredReward.push(newAcquiredReward);
                        var UpdateUserReadOnlyDataRequest =
                        {
                            "PlayFabId": currentPlayerId,
                            "Data": {}
                        };
                        if(args.freereward)
                            UpdateUserReadOnlyDataRequest.Data[BP_ACQUIRED_FREE_REWARD] = JSON.stringify(AcquiredReward);
                        else
                            UpdateUserReadOnlyDataRequest.Data[BP_ACQUIRED_PREMIUM_REWARD] = JSON.stringify(AcquiredReward);
                        server.UpdateUserReadOnlyData(UpdateUserReadOnlyDataRequest);
                        result.Success = true;
                    }

                    return result;
                }
            }

            result.InsufficientLevel = true;
            return result;
        }
    }
}
