/* eslint-disable @typescript-eslint/no-unused-vars */
import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config";
import { ID, Query } from "appwrite";

export async function createUserAccount(user : INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name
        );

        if(!newAccount) throw Error;

        const avatarUrl = avatars.getInitials(user.name);

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl
        });

        return newUser;
    } catch (error) {
        console.log(error)
    }
}

export async function saveUserToDB( user: { 
    accountId: string; 
    email: string; 
    name: string; 
    username?: string;
    imageUrl :  URL;
 }) {
    console.log(`DB_ID: ${appwriteConfig.databaseId}`);
    console.log(`USER_COLLECTION_ID: ${appwriteConfig.userCollectionId}`);
    console.log(user);
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user);
        return newUser;
    } catch (error) {
        console.log(error)
    }
}

export async function signInAccount( user: { email: string; password: string}){
    try {
        const session = await account.createEmailSession(user.email, user.password);
        return session;
    } catch (error) {
        console.log(error);
    }
}

export async function signOutAccount(){
    try {
        const session = await account.deleteSession("current");
        return session;
    } catch (error) {
        console.log(error);
    }
}

export async function getCurrentUser() {
    try {
        const currentAccount = await account.get();

        if(!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if(!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error);
    }
}

export async function createPost(post: INewPost) {
    try {
        const uploadfile = await uploadFile(post.file[0]);

        if (!uploadfile) throw Error;

        //Get file url
        const fileUrl = getFilePreview(uploadfile.$id);
        if(!fileUrl) {
            await deleteFile(uploadfile.$id);
            throw Error;
        }

        const tags = post.tags?.replace(/ /g,"").split(",") || [];

        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadfile.$id,
                location: post.location,
                tags: tags
            }
        )

        if(!newPost) {
            await deleteFile(uploadfile.$id);
            throw Error;
        }

        return newPost;
    } catch (error) {
        console.log(error);
    }
}

export async function uploadFile(file: File) {
    try {
        const uploadedfile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file
        );
        return uploadedfile;
    } catch (error) {
        console.log(error);
    }
}

export function getFilePreview(filedId: string) {
    try {
        const fileUrl = storage.getFilePreview(
            appwriteConfig.storageId,
            filedId,
            2000,
            2000,
            "top",
            100
        );

        if(!fileUrl) throw Error;
        
        return fileUrl;
    } catch (error) {
        console.log(error);
    }
}

export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile(appwriteConfig.storageId,fileId);
    } catch (error) {
        console.log(error);
    }
}

export async function searchPosts(searchTerm: string){
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            [Query.search("caption",searchTerm)]
        );

        if(!posts) throw Error;

        return posts;
    } catch (error) {
        console.log(error);
    }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
    const queries = [Query.orderDesc("$updatedAt"), Query.limit(9)];

    if(pageParam) {
        queries.push(Query.cursorAfter(pageParam.toString()));
    }

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            queries
        );


        if(!posts) throw Error;

        return posts;
    } catch (error) {
        console.log(error);
    }
}

export async function getPostById(postId?: string) {
    if(!postId) throw Error;

    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            postId
        );

        if(!post) throw Error;

        return post;
    } catch (error) {
        console.log(error);
    }
}

export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;
    
    try {
        let image = {
            imageUrl : post.imageUrl,
            imageId: post.imageId
        }

        if(hasFileToUpdate) {
            const uploadedFile = await uploadFile(post.file[0]);
            if(!uploadedFile) throw Error;

            const fileUrl = getFilePreview(uploadedFile.$id);
            if(!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }

            image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id }
        }

        const tags = post.tags?.replace(/ /g,"").split(",") || [];

        const updatePost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            post.postId,
            {
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: post.imageId,
                location: post.location,
                tags: tags
            }
        );

        if(!updatePost) {
            if(hasFileToUpdate) {
                await deleteFile(image.imageId);
            }

            throw Error;
        }

        if(hasFileToUpdate) {
            await deleteFile(post.imageId);
        }

        return updatePost;
    } catch (error) {
        console.log(error);
    }
}

export async function deletePost(postId?: string, imageId?: string) {
    if (!postId || !imageId) return;

    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            postId
        );

        if(!statusCode) throw Error;

        await deleteFile(imageId);

        return { status: "Ok" };
    } catch (error) {
        console.log(error);
    }
}

export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatePost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            postId,
            {
                likes:likesArray
            }
        );

        if(!updatePost) throw Error;

        return updatePost;
    } catch (error) {
        console.log(error);
    }
}

export async function savePost(userId: string, postId: string) {
    try {
        const updatedPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            ID.unique(),
            {
                user: userId,
                post: postId
            }
        );

        if(!updatedPost) throw Error;

        return updatedPost;
    } catch (error) {
        console.log(error);
    }
}

export async function deleteSavedPost(saveRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            saveRecordId
        );

        if(!statusCode) throw Error;

        return { status: "Ok"}
    } catch (error) {
        console.log(error);
    }
}

export async function getUserPosts(userId?: string) {
    if(!userId) return;

    try {
        const post = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            [Query.equal("creator",userId),Query.orderDesc("$createdAt")]
        );

        if(!post) throw Error;

        return post;
    } catch (error) {
        console.log(error);
    }
}

export async function getRecentPosts() {

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            [Query.orderDesc("$createdAt"),Query.limit(20)]
        );

        if(!posts) throw Error;

        return posts;
    } catch (error) {
        console.log(error);
    }
}

export async function getUsers(limit?: number) {
    const queries = [Query.orderDesc("$createdAt")];

    if(limit) {
        queries.push(Query.limit(limit));
    }

    try {
        const user = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            queries
        );

        if(!user) throw Error;

        return user;
    } catch (error) {
        console.log(error);
    }
}

export async function getUserById(userId: string) {
    try {
        const user = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId
        );

        if(!user) throw Error;

        return user;
    } catch (error) {
        console.log(error);
    }
}

export async function updateUser(user: IUpdateUser) {
    const hasFileToUpdate = user.file.length > 0;
    try {
        let image = {
            imageUrl: user.imageUrl,
            imageId: user.imageId
        };

        if(hasFileToUpdate) {
            const uploadedFile = await uploadFile(user.file[0]);
            if (!uploadedFile) throw Error;

            // Get new file url
            const fileUrl = getFilePreview(uploadedFile.$id);
            if (!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }

            image = { ...image, imageUrl: fileUrl,imageId: uploadedFile.$id}
        }

        const updatedUser = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.userId,
            {
                name: user.name,
                bio: user.bio,
                imageUrl: image.imageUrl,
                imageId: image.imageId
            }
        );

        if(!updatedUser) {
            if(hasFileToUpdate) {
                await deleteFile(image.imageId);
            }

            throw Error;
        }

        if(user.imageId && hasFileToUpdate) {
            await deleteFile(user.imageId);
        }

        return updatedUser;
    } catch (error) {
        console.log(error);
    }

}