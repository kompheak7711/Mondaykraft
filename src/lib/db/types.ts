
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activities": {
                  Row: {
                    "actor_id": string | null,"automation_id": string | null,"board_id": string,"column_id": string | null,"created_at": string,"id": number,"item_id": string | null,"kind": string,"new_value": Json | null,"old_value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"automation_id"?: string | null,"board_id": string,"column_id"?: string | null,"created_at"?: string,"id"?: never,"item_id"?: string | null,"kind": string,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Update: {
                    "actor_id"?: string | null,"automation_id"?: string | null,"board_id"?: string,"column_id"?: string | null,"created_at"?: string,"id"?: never,"item_id"?: string | null,"kind"?: string,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_column_id_fkey"
      columns: ["column_id"]
isOneToOne: false
      referencedRelation: "columns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"assets": {
                  Row: {
                    "board_id": string,"column_id": string | null,"created_at": string,"deleted_at": string | null,"id": string,"item_id": string,"mime": string,"name": string,"size": number,"storage_path": string,"update_id": string | null,"uploaded_by": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"column_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"item_id": string,"mime": string,"name": string,"size": number,"storage_path": string,"update_id"?: string | null,"uploaded_by"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "board_id"?: string,"column_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"item_id"?: string,"mime"?: string,"name"?: string,"size"?: number,"storage_path"?: string,"update_id"?: string | null,"uploaded_by"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assets_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_column_id_fkey"
      columns: ["column_id"]
isOneToOne: false
      referencedRelation: "columns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_update_id_fkey"
      columns: ["update_id"]
isOneToOne: false
      referencedRelation: "updates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assets_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"automation_runs": {
                  Row: {
                    "automation_id": string,"board_id": string,"depth": number,"error": string | null,"finished_at": string | null,"fire_date": string | null,"id": string,"item_id": string | null,"started_at": string,"status": Database["public"]['Enums']["run_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "automation_id": string,"board_id": string,"depth"?: number,"error"?: string | null,"finished_at"?: string | null,"fire_date"?: string | null,"id"?: string,"item_id"?: string | null,"started_at"?: string,"status": Database["public"]['Enums']["run_status"]
                  }
                  Update: {
                    "automation_id"?: string,"board_id"?: string,"depth"?: number,"error"?: string | null,"finished_at"?: string | null,"fire_date"?: string | null,"id"?: string,"item_id"?: string | null,"started_at"?: string,"status"?: Database["public"]['Enums']["run_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "automation_runs_automation_id_fkey"
      columns: ["automation_id"]
isOneToOne: false
      referencedRelation: "automations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "automation_runs_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "automation_runs_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"automations": {
                  Row: {
                    "actions": NonNullable<Json>,"board_id": string,"conditions": NonNullable<Json>,"created_at": string,"created_by": string | null,"deleted_at": string | null,"enabled": boolean,"id": string,"last_run_at": string | null,"name": string,"run_count": number,"trigger": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actions": NonNullable<Json>,"board_id": string,"conditions"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"enabled"?: boolean,"id"?: string,"last_run_at"?: string | null,"name": string,"run_count"?: number,"trigger": NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "actions"?: NonNullable<Json>,"board_id"?: string,"conditions"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"enabled"?: boolean,"id"?: string,"last_run_at"?: string | null,"name"?: string,"run_count"?: number,"trigger"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "automations_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "automations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"board_members": {
                  Row: {
                    "board_id": string,"created_at": string,"muted": boolean,"role": Database["public"]['Enums']["board_role"],"subscribed": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"created_at"?: string,"muted"?: boolean,"role"?: Database["public"]['Enums']["board_role"],"subscribed"?: boolean,"user_id": string
                  }
                  Update: {
                    "board_id"?: string,"created_at"?: string,"muted"?: boolean,"role"?: Database["public"]['Enums']["board_role"],"subscribed"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_members_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"boards": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"description": string | null,"folder_id": string | null,"id": string,"kind": Database["public"]['Enums']["board_kind"],"name": string,"permission_set": Database["public"]['Enums']["permission_set"],"position": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"folder_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["board_kind"],"name": string,"permission_set"?: Database["public"]['Enums']["permission_set"],"position"?: number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"folder_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["board_kind"],"name"?: string,"permission_set"?: Database["public"]['Enums']["permission_set"],"position"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "boards_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boards_folder_id_fkey"
      columns: ["folder_id"]
isOneToOne: false
      referencedRelation: "folders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "boards_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"column_values": {
                  Row: {
                    "board_id": string,"column_id": string,"created_at": string,"item_id": string,"text": string,"text_tsv": unknown,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"column_id": string,"created_at"?: string,"item_id": string,"text"?: string,"text_tsv"?: never,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "board_id"?: string,"column_id"?: string,"created_at"?: string,"item_id"?: string,"text"?: string,"text_tsv"?: never,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "column_values_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "column_values_column_id_fkey"
      columns: ["column_id"]
isOneToOne: false
      referencedRelation: "columns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "column_values_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "column_values_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"columns": {
                  Row: {
                    "board_id": string,"created_at": string,"deleted_at": string | null,"description": string | null,"id": string,"position": number,"scope": Database["public"]['Enums']["column_scope"],"settings": NonNullable<Json>,"title": string,"type": Database["public"]['Enums']["column_type"],"updated_at": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"position"?: number,"scope"?: Database["public"]['Enums']["column_scope"],"settings"?: NonNullable<Json>,"title": string,"type": Database["public"]['Enums']["column_type"],"updated_at"?: string,"width"?: number
                  }
                  Update: {
                    "board_id"?: string,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"position"?: number,"scope"?: Database["public"]['Enums']["column_scope"],"settings"?: NonNullable<Json>,"title"?: string,"type"?: Database["public"]['Enums']["column_type"],"updated_at"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "columns_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    }
                  ]
                },"dashboard_boards": {
                  Row: {
                    "board_id": string,"created_at": string,"dashboard_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"created_at"?: string,"dashboard_id": string
                  }
                  Update: {
                    "board_id"?: string,"created_at"?: string,"dashboard_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dashboard_boards_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dashboard_boards_dashboard_id_fkey"
      columns: ["dashboard_id"]
isOneToOne: false
      referencedRelation: "dashboards"
      referencedColumns: ["id"]
    }
                  ]
                },"dashboards": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"folder_id": string | null,"id": string,"kind": Database["public"]['Enums']["board_kind"],"name": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"folder_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["board_kind"],"name": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"folder_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["board_kind"],"name"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dashboards_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dashboards_folder_id_fkey"
      columns: ["folder_id"]
isOneToOne: false
      referencedRelation: "folders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dashboards_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "board_id": string | null,"created_at": string,"dashboard_id": string | null,"id": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id"?: string | null,"created_at"?: string,"dashboard_id"?: string | null,"id"?: string,"position"?: number,"user_id": string
                  }
                  Update: {
                    "board_id"?: string | null,"created_at"?: string,"dashboard_id"?: string | null,"id"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_dashboard_id_fkey"
      columns: ["dashboard_id"]
isOneToOne: false
      referencedRelation: "dashboards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"folders": {
                  Row: {
                    "color": string | null,"created_at": string,"id": string,"name": string,"parent_folder_id": string | null,"position": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"id"?: string,"name": string,"parent_folder_id"?: string | null,"position"?: number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"parent_folder_id"?: string | null,"position"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "folders_parent_folder_id_fkey"
      columns: ["parent_folder_id"]
isOneToOne: false
      referencedRelation: "folders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "folders_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "archived_at": string | null,"board_id": string,"color": string,"created_at": string,"deleted_at": string | null,"id": string,"position": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"board_id": string,"color"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"position"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"board_id"?: string,"color"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"role": Database["public"]['Enums']["workspace_role"],"token": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["workspace_role"],"token"?: string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["workspace_role"],"token"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "archived_at": string | null,"board_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"group_id": string | null,"id": string,"name": string,"name_tsv": unknown,"parent_item_id": string | null,"position": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"board_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"group_id"?: string | null,"id"?: string,"name": string,"name_tsv"?: never,"parent_item_id"?: string | null,"position"?: number,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"board_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"group_id"?: string | null,"id"?: string,"name"?: string,"name_tsv"?: never,"parent_item_id"?: string | null,"position"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_parent_item_id_fkey"
      columns: ["parent_item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"automation_id": string | null,"board_id": string | null,"created_at": string,"id": string,"item_id": string | null,"kind": Database["public"]['Enums']["notification_kind"],"read_at": string | null,"text": string,"update_id": string | null,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"automation_id"?: string | null,"board_id"?: string | null,"created_at"?: string,"id"?: string,"item_id"?: string | null,"kind": Database["public"]['Enums']["notification_kind"],"read_at"?: string | null,"text": string,"update_id"?: string | null,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"automation_id"?: string | null,"board_id"?: string | null,"created_at"?: string,"id"?: string,"item_id"?: string | null,"kind"?: Database["public"]['Enums']["notification_kind"],"read_at"?: string | null,"text"?: string,"update_id"?: string | null,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_automation_id_fkey"
      columns: ["automation_id"]
isOneToOne: false
      referencedRelation: "automations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_update_id_fkey"
      columns: ["update_id"]
isOneToOne: false
      referencedRelation: "updates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string,"id": string,"my_work_hidden_board_ids": (string)[],"name": string,"notification_prefs": NonNullable<Json>,"theme": string,"timezone": string,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email": string,"id": string,"my_work_hidden_board_ids"?: (string)[],"name": string,"notification_prefs"?: NonNullable<Json>,"theme"?: string,"timezone"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"my_work_hidden_board_ids"?: (string)[],"name"?: string,"notification_prefs"?: NonNullable<Json>,"theme"?: string,"timezone"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reactions": {
                  Row: {
                    "created_at": string,"emoji": string,"update_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"emoji": string,"update_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"emoji"?: string,"update_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_update_id_fkey"
      columns: ["update_id"]
isOneToOne: false
      referencedRelation: "updates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "color": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"workspace_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tags_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tags_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"updates": {
                  Row: {
                    "author_id": string | null,"board_id": string,"body": NonNullable<Json>,"body_text": string,"body_tsv": unknown,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"item_id": string,"parent_update_id": string | null,"pinned": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"board_id": string,"body": NonNullable<Json>,"body_text"?: string,"body_tsv"?: never,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"item_id": string,"parent_update_id"?: string | null,"pinned"?: boolean
                  }
                  Update: {
                    "author_id"?: string | null,"board_id"?: string,"body"?: NonNullable<Json>,"body_text"?: string,"body_tsv"?: never,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"item_id"?: string,"parent_update_id"?: string | null,"pinned"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "updates_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "updates_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "updates_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "updates_parent_update_id_fkey"
      columns: ["parent_update_id"]
isOneToOne: false
      referencedRelation: "updates"
      referencedColumns: ["id"]
    }
                  ]
                },"views": {
                  Row: {
                    "board_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"is_default": boolean,"name": string,"position": number,"settings": NonNullable<Json>,"type": Database["public"]['Enums']["view_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_default"?: boolean,"name": string,"position"?: number,"settings"?: NonNullable<Json>,"type"?: Database["public"]['Enums']["view_type"],"updated_at"?: string
                  }
                  Update: {
                    "board_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_default"?: boolean,"name"?: string,"position"?: number,"settings"?: NonNullable<Json>,"type"?: Database["public"]['Enums']["view_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "views_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "views_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"widgets": {
                  Row: {
                    "created_at": string,"dashboard_id": string,"id": string,"layout": NonNullable<Json>,"settings": NonNullable<Json>,"title": string,"type": Database["public"]['Enums']["widget_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dashboard_id": string,"id"?: string,"layout"?: NonNullable<Json>,"settings"?: NonNullable<Json>,"title"?: string,"type": Database["public"]['Enums']["widget_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"dashboard_id"?: string,"id"?: string,"layout"?: NonNullable<Json>,"settings"?: NonNullable<Json>,"title"?: string,"type"?: Database["public"]['Enums']["widget_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "widgets_dashboard_id_fkey"
      columns: ["dashboard_id"]
isOneToOne: false
      referencedRelation: "dashboards"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "joined_at": string,"role": Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "joined_at"?: string,"role"?: Database["public"]['Enums']["workspace_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "color": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"description": string | null,"id": string,"name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"name": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "item_update_counts": {
                  Row: {
                    "board_id": string,"count": number | null,"item_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "updates_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "updates_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "p_token": string }; Returns: string
                           },
"board_access":
{ Args: { "p_board": string }; Returns: Json
                           },
"bulk_items":
{ Args: { "p_action": string,"p_ids": (string)[],"p_target"?: string }; Returns: number
                           },
"create_board":
{ Args: { "p_definition"?: Json,"p_folder"?: string,"p_name": string,"p_workspace": string }; Returns: string
                           },
"delete_label":
{ Args: { "p_column": string,"p_label_id": string,"p_move_to"?: string }; Returns: number
                           },
"duplicate_board":
{ Args: { "p_board": string,"p_mode"?: string }; Returns: string
                           },
"duplicate_group":
{ Args: { "p_group": string }; Returns: string
                           },
"move_rows":
{ Args: { "p_after"?: string,"p_container"?: string,"p_ids": (string)[],"p_table": string }; Returns: undefined
                           },
"my_work":
{ Args: { "p_show_done"?: boolean }; Returns: {
              "board_id": string,"board_name": string,"date_column_id": string,"due": string,"group_id": string,"group_title": string,"is_done": boolean,"item_id": string,"item_name": string,"parent_item_id": string,"parent_name": string,"people_column_id": string,"status": Json,"status_column_id": string,"status_label": string
            }[]
                           },
"purge_trash":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"restore":
{ Args: { "p_id": string,"p_kind": string }; Returns: number
                           },
"run_date_automations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"search":
{ Args: { "lim"?: number,"q": string }; Returns: {
              "board_id": string,"id": string,"item_id": string,"kind": string,"rank": number,"snippet": string,"title": string
            }[]
                           },
"set_default_view":
{ Args: { "p_view": string }; Returns: undefined
                           },
"widget_data":
{ Args: { "p_widget": string }; Returns: Json
                           },
"workspace_people":
{ Args: { "p_workspace": string }; Returns: {
              "avatar_url": string,"email": string,"id": string,"name": string,"role": Database["public"]['Enums']["workspace_role"]
            }[]
                           }
          }
          Enums: {
            "board_kind": "main"|"private","board_role": "owner"|"member"|"viewer","column_scope": "item"|"subitem","column_type": "status"|"priority"|"people"|"date"|"timeline"|"numbers"|"text"|"long_text"|"dropdown"|"tags"|"checkbox"|"link"|"files"|"progress"|"creation_log"|"last_updated","notification_kind": "mention"|"assigned"|"reply"|"update"|"automation"|"deleted"|"archived","permission_set": "edit_everything"|"edit_content"|"edit_assigned"|"view_comment","run_status": "ok"|"failed"|"skipped","view_type": "table"|"kanban"|"calendar"|"timeline"|"chart","widget_type": "numbers"|"chart"|"battery"|"workload"|"table","workspace_role": "owner"|"admin"|"member"|"viewer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "board_kind": ["main", "private"],"board_role": ["owner", "member", "viewer"],"column_scope": ["item", "subitem"],"column_type": ["status", "priority", "people", "date", "timeline", "numbers", "text", "long_text", "dropdown", "tags", "checkbox", "link", "files", "progress", "creation_log", "last_updated"],"notification_kind": ["mention", "assigned", "reply", "update", "automation", "deleted", "archived"],"permission_set": ["edit_everything", "edit_content", "edit_assigned", "view_comment"],"run_status": ["ok", "failed", "skipped"],"view_type": ["table", "kanban", "calendar", "timeline", "chart"],"widget_type": ["numbers", "chart", "battery", "workload", "table"],"workspace_role": ["owner", "admin", "member", "viewer"]
          }
        }
} as const
