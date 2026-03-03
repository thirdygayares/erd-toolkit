import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ColumnCreateRequest,
  ColumnMutationResponse,
  ColumnUpdateRequest,
  RelationshipCreateRequest,
  RelationshipMutationResponse,
  RelationshipUpdateRequest,
  TableCreateRequest,
  TableMutationResponse,
  TableUpdateRequest,
} from "@/lib/types";

export class SchemaEditorService {
  async createTable(
    diagramId: string,
    payload: TableCreateRequest,
  ): Promise<TableMutationResponse> {
    const { data } = await axiosInstance.post<TableMutationResponse>(
      `/diagrams/${diagramId}/tables`,
      payload,
    );
    return data;
  }

  async updateTable(
    diagramId: string,
    tableId: string,
    payload: TableUpdateRequest,
  ): Promise<TableMutationResponse> {
    const { data } = await axiosInstance.patch<TableMutationResponse>(
      `/diagrams/${diagramId}/tables/${tableId}`,
      payload,
    );
    return data;
  }

  async createColumn(
    diagramId: string,
    tableId: string,
    payload: ColumnCreateRequest,
  ): Promise<ColumnMutationResponse> {
    const { data } = await axiosInstance.post<ColumnMutationResponse>(
      `/diagrams/${diagramId}/tables/${tableId}/columns`,
      payload,
    );
    return data;
  }

  async updateColumn(
    diagramId: string,
    tableId: string,
    columnId: string,
    payload: ColumnUpdateRequest,
  ): Promise<ColumnMutationResponse> {
    const { data } = await axiosInstance.patch<ColumnMutationResponse>(
      `/diagrams/${diagramId}/tables/${tableId}/columns/${columnId}`,
      payload,
    );
    return data;
  }

  async deleteColumn(
    diagramId: string,
    tableId: string,
    columnId: string,
  ): Promise<ColumnMutationResponse> {
    const { data } = await axiosInstance.delete<ColumnMutationResponse>(
      `/diagrams/${diagramId}/tables/${tableId}/columns/${columnId}`,
    );
    return data;
  }

  async createRelationship(
    diagramId: string,
    payload: RelationshipCreateRequest,
  ): Promise<RelationshipMutationResponse> {
    const { data } = await axiosInstance.post<RelationshipMutationResponse>(
      `/diagrams/${diagramId}/relationships`,
      payload,
    );
    return data;
  }

  async updateRelationship(
    diagramId: string,
    relationshipId: string,
    payload: RelationshipUpdateRequest,
  ): Promise<RelationshipMutationResponse> {
    const { data } = await axiosInstance.patch<RelationshipMutationResponse>(
      `/diagrams/${diagramId}/relationships/${relationshipId}`,
      payload,
    );
    return data;
  }

  async deleteRelationship(
    diagramId: string,
    relationshipId: string,
  ): Promise<RelationshipMutationResponse> {
    const { data } = await axiosInstance.delete<RelationshipMutationResponse>(
      `/diagrams/${diagramId}/relationships/${relationshipId}`,
    );
    return data;
  }
}
